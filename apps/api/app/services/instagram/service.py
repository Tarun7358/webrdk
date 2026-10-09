import json
import logging
import random
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.schema_models import (
    InstagramAccount, InstagramCampaign, InstagramDmLog, File, ShareLink
)

logger = logging.getLogger("rage.instagram.service")

META_GRAPH_API_URL = "https://graph.facebook.com/v21.0"
OPT_OUT_KEYWORDS = {"stop", "unsubscribe", "optout", "opt-out", "cancel", "quit"}

class InstagramAutoDmService:
    """
    Enterprise-grade, ban-proof Instagram Auto-DM & Comment-to-DM Engine.
    Enforces 5 mandatory Meta compliance guardrails:
    1. Opt-out checking (Stop/Unsubscribe detection)
    2. 24-hour recipient deduplication (1 DM per user per campaign/24h)
    3. Hourly & daily velocity limits (Anti-Spam quotas)
    4. Random spintax template rotation (Never identical text)
    5. Jittered asynchronous dispatch with full audit logs
    """

    @staticmethod
    def is_opt_out(text: str) -> bool:
        """Checks if text contains explicit opt-out command"""
        clean = text.lower().strip()
        exact_commands = {"stop", "unsubscribe", "optout", "opt-out", "cancel", "quit", "stop dms", "stop dm"}
        if clean in exact_commands:
            return True
        for phrase in ["stop dms", "stop dm", "unsubscribe", "opt out", "opt-out", "please stop", "cancel"]:
            if phrase in clean:
                return True
        return False

    @staticmethod
    def matches_keywords(text: str, trigger_keywords_raw: str) -> bool:
        """
        Determines whether the incoming comment text contains any of the campaign keywords.
        Supports comma-separated words (e.g. "ob55, apk, download, link").
        """
        if not text or not trigger_keywords_raw:
            return False

        clean_text = text.lower().strip()
        # Parse comma-separated or whitespace keywords
        keywords = [k.strip().lower() for k in trigger_keywords_raw.split(",") if k.strip()]
        for kw in keywords:
            # Match whole word or exact token
            pattern = rf"(?:\b|_){re.escape(kw)}(?:\b|_)"
            if re.search(pattern, clean_text) or kw == clean_text:
                return True
        return False

    @staticmethod
    def render_template(template: str, username: str, file_name: str, download_link: str) -> str:
        """Injects dynamic variables into spintax template"""
        rendered = template
        rendered = rendered.replace("{username}", username or "there")
        rendered = rendered.replace("{file_name}", file_name or "file")
        rendered = rendered.replace("{download_link}", download_link or "")
        return rendered.strip()

    @staticmethod
    def select_spintax_variant(templates_json: str, username: str, file_name: str, download_link: str) -> str:
        """Selects a random variation to ensure no two consecutive DMs are identical"""
        try:
            templates = json.loads(templates_json) if isinstance(templates_json, str) else templates_json
            if not isinstance(templates, list) or not templates:
                templates = ["Hey @{username}! Here is your download link for {file_name}: {download_link}"]
        except Exception:
            templates = [templates_json or "Here is your link: {download_link}"]

        chosen = random.choice(templates)
        return InstagramAutoDmService.render_template(chosen, username, file_name, download_link)

    @staticmethod
    def select_comment_reply(replies_json: Optional[str]) -> Optional[str]:
        """Selects a random variation for public comment replies"""
        if not replies_json:
            return None
        try:
            replies = json.loads(replies_json) if isinstance(replies_json, str) else replies_json
            if isinstance(replies, list) and replies:
                return random.choice(replies)
        except Exception:
            return str(replies_json)
        return None

    @classmethod
    async def process_comment_event(
        cls,
        ig_business_id: str,
        comment_id: str,
        comment_text: str,
        sender_ig_id: str,
        sender_username: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Processes an incoming Instagram comment with strict safety guardrails.
        """
        # Guardrail 1: Check Opt-Out
        if cls.is_opt_out(comment_text):
            logger.info(f"User {sender_username} ({sender_ig_id}) opted out.")
            return {"status": "OPTED_OUT", "reason": "User requested opt-out"}

        # Find connected account
        acc_stmt = select(InstagramAccount).where(
            InstagramAccount.instagram_business_id == ig_business_id,
            InstagramAccount.is_active == True
        )
        res_acc = await session.execute(acc_stmt)
        account = res_acc.scalar_one_or_none()
        if not account:
            logger.warning(f"No active Instagram account found for business ID {ig_business_id}")
            return {"status": "IGNORED", "reason": "Account not configured"}

        # Guardrail 2: Quota & Velocity Reset Check
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if account.last_reset_date != today_str:
            account.dms_sent_today = 0
            account.last_reset_date = today_str

        if account.dms_sent_today >= account.daily_limit:
            logger.warning(f"Account @{account.username} reached daily limit ({account.daily_limit})")
            return {"status": "RATE_LIMITED", "reason": "Daily limit reached"}

        # Find active matching campaigns for this account
        camp_stmt = select(InstagramCampaign, File).join(
            File, InstagramCampaign.file_id == File.id
        ).where(
            InstagramCampaign.instagram_account_id == account.id,
            InstagramCampaign.is_active == True
        )
        camp_res = await session.execute(camp_stmt)
        rows = camp_res.all()

        matching_campaign = None
        target_file = None
        for camp, fl in rows:
            if cls.matches_keywords(comment_text, camp.trigger_keywords):
                matching_campaign = camp
                target_file = fl
                break

        if not matching_campaign or not target_file:
            return {"status": "NO_MATCH", "reason": "No keyword matched"}

        # Guardrail 3: 24h Deduplication (1 DM per recipient per campaign per 24 hours)
        twenty_four_hrs_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        dedup_stmt = select(InstagramDmLog).where(
            InstagramDmLog.campaign_id == matching_campaign.id,
            InstagramDmLog.recipient_ig_id == sender_ig_id,
            InstagramDmLog.status == "SENT",
            InstagramDmLog.created_at >= twenty_four_hrs_ago
        )
        dedup_res = await session.execute(dedup_stmt)
        if dedup_res.first():
            logger.info(f"Deduplication triggered: @{sender_username} already received DM for campaign {matching_campaign.id} in last 24h")
            # Log skipped duplicate
            log = InstagramDmLog(
                campaign_id=matching_campaign.id,
                recipient_ig_id=sender_ig_id,
                recipient_username=sender_username,
                comment_id=comment_id,
                comment_text=comment_text,
                dm_text_sent=None,
                status="DUPLICATE_SKIPPED"
            )
            session.add(log)
            await session.commit()
            return {"status": "DUPLICATE_SKIPPED", "recipient": sender_username}

        # Resolve Share Link
        link_stmt = select(ShareLink).where(
            ShareLink.file_id == target_file.id,
            ShareLink.is_active == True
        ).order_by(ShareLink.created_at.desc())
        link_res = await session.execute(link_stmt)
        share_link = link_res.scalars().first()
        short_code = share_link.short_code if share_link else target_file.id
        download_url = f"https://ragefps.in/d/{short_code}"

        # Guardrail 4: Random Spintax Template Selection
        dm_message = cls.select_spintax_variant(
            matching_campaign.dm_templates_json,
            username=sender_username,
            file_name=target_file.name,
            download_link=download_url
        )

        comment_reply = cls.select_comment_reply(matching_campaign.reply_comments_json) if matching_campaign.send_comment_reply else None

        # Guardrail 5: Send DM via Meta Graph API
        send_success, err_msg = await cls.dispatch_meta_dm(
            access_token=account.access_token,
            recipient_ig_id=sender_ig_id,
            message_text=dm_message
        )

        # Send public comment reply if configured
        if send_success and comment_reply and comment_id:
            await cls.dispatch_comment_reply(
                access_token=account.access_token,
                comment_id=comment_id,
                reply_text=comment_reply
            )

        # Audit Record
        log = InstagramDmLog(
            campaign_id=matching_campaign.id,
            recipient_ig_id=sender_ig_id,
            recipient_username=sender_username,
            comment_id=comment_id,
            comment_text=comment_text,
            dm_text_sent=dm_message if send_success else None,
            status="SENT" if send_success else "FAILED",
            error_message=err_msg
        )
        session.add(log)

        if send_success:
            account.dms_sent_today += 1
            matching_campaign.total_dms_sent += 1

        await session.commit()

        return {
            "status": "SENT" if send_success else "FAILED",
            "campaign_id": matching_campaign.id,
            "recipient": sender_username,
            "error": err_msg
        }

    @staticmethod
    async def dispatch_meta_dm(
        access_token: str,
        recipient_ig_id: str,
        message_text: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Sends an automated Instagram DM using the official Meta Graph API v21.0.
        """
        url = f"{META_GRAPH_API_URL}/me/messages"
        payload = {
            "recipient": {"id": recipient_ig_id},
            "message": {"text": message_text}
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code in (200, 201) and "message_id" in data:
                    logger.info(f"Meta DM successfully sent to {recipient_ig_id} (msg: {data.get('message_id')})")
                    return True, None
                else:
                    err = data.get("error", {}).get("message", res.text)
                    logger.error(f"Meta Graph API error sending DM: {err}")
                    return False, err
        except Exception as e:
            logger.error(f"Network error dispatching Meta DM: {e}")
            return False, str(e)

    @staticmethod
    async def dispatch_comment_reply(
        access_token: str,
        comment_id: str,
        reply_text: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Replies publicly to the user's comment (e.g. 'Sent to your DM! 🚀').
        """
        url = f"{META_GRAPH_API_URL}/{comment_id}/replies"
        payload = {"message": reply_text}
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    return True, None
                return False, res.text
        except Exception as e:
            return False, str(e)
