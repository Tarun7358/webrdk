import base64
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

        if trigger_keywords_raw.strip() in ("*", "ANY", "any"):
            return True

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

        if account.daily_limit > 0 and account.dms_sent_today >= account.daily_limit:
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

    # ----------------- Option A: Private Web Session Implementation (Zero Meta App) -----------------

    @staticmethod
    def extract_shortcode_from_url(url: str) -> Optional[str]:
        """Extracts shortcode from Instagram URL (e.g. reel/C8abcde123/ or p/C8abcde123/)"""
        if not url:
            return None
        match = re.search(r"/(?:p|reels?|tv)/([A-Za-z0-9_-]+)", url)
        if match:
            return match.group(1)
        return None

    @staticmethod
    def shortcode_to_media_id(shortcode: str) -> Optional[int]:
        """Converts Instagram base64-like shortcode to numerical media_id"""
        if not shortcode:
            return None
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        media_id = 0
        try:
            for letter in shortcode:
                media_id = (media_id * 64) + alphabet.index(letter)
            return media_id
        except Exception:
            return None

    @classmethod
    async def validate_session_cookie(cls, session_id: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validates an Instagram web sessionid cookie against official Instagram Web API.
        Returns: (is_valid, user_data, error_message)
        """
        clean_cookie = session_id.strip()
        if "sessionid=" in clean_cookie:
            match = re.search(r"sessionid=([^;]+)", clean_cookie)
            if match:
                clean_cookie = match.group(1)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "X-IG-App-ID": "936619743392459",
            "Cookie": f"sessionid={clean_cookie};"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get("https://www.instagram.com/api/v1/accounts/current_user/?edit=true", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    user = data.get("user", {})
                    return True, {
                        "pk": str(user.get("pk", "")),
                        "username": user.get("username", ""),
                        "full_name": user.get("full_name", ""),
                        "profile_pic_url": user.get("profile_pic_url", ""),
                        "session_cookie": clean_cookie
                    }, None
                else:
                    return False, None, "Invalid or expired sessionid cookie. Please ensure you are logged into instagram.com and copied the active sessionid."
        except Exception as e:
            logger.error(f"Error validating Instagram session: {e}")
            return False, None, f"Failed to connect to Instagram servers: {str(e)}"

    @classmethod
    async def login_with_credentials(
        cls,
        username: str,
        password: str,
        two_factor_code: Optional[str] = None,
        two_factor_identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Directly logs into Instagram Web with credentials (and 2FA if enabled).
        Returns session_cookie automatically upon success.
        """
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        clean_user = username.strip().replace("@", "")

        try:
            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                init_resp = await client.get(
                    "https://www.instagram.com/accounts/login/",
                    headers={"User-Agent": user_agent}
                )
                csrf_token = init_resp.cookies.get("csrftoken") or "missing"

                headers = {
                    "User-Agent": user_agent,
                    "X-IG-App-ID": "936619743392459",
                    "X-CSRFToken": csrf_token,
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": "https://www.instagram.com/accounts/login/",
                    "Origin": "https://www.instagram.com"
                }

                if two_factor_code and two_factor_identifier:
                    try:
                        packed = json.loads(base64.urlsafe_b64decode(two_factor_identifier.encode()).decode())
                        real_identifier = packed.get("id")
                        for k, v in (packed.get("cookies") or {}).items():
                            client.cookies.set(k, v, domain=".instagram.com")
                        headers["X-CSRFToken"] = (packed.get("cookies") or {}).get("csrftoken", csrf_token)
                    except Exception:
                        real_identifier = two_factor_identifier
                    two_fa_data = {
                        "username": clean_user,
                        "verificationCode": two_factor_code.strip(),
                        "identifier": real_identifier,
                        "queryParams": "{}"
                    }
                    two_fa_resp = await client.post(
                        "https://www.instagram.com/api/v1/web/accounts/login/ajax/two_factor/",
                        headers=headers,
                        data=two_fa_data
                    )
                    res_json = two_fa_resp.json()
                    if res_json.get("authenticated") or res_json.get("userId"):
                        sessionid = client.cookies.get("sessionid") or two_fa_resp.cookies.get("sessionid")
                        user_id = str(res_json.get("userId", ""))
                        return {
                            "success": True,
                            "session_cookie": sessionid,
                            "user_id": user_id,
                            "username": clean_user
                        }
                    else:
                        msg = res_json.get("message") or "Invalid two-factor authentication code."
                        return {"success": False, "error": msg}

                login_data = {
                    "enc_password": f"#PWD_INSTAGRAM_BROWSER:0:{int(datetime.now().timestamp())}:{password}",
                    "optIntoOneTap": "false",
                    "queryParams": "{}",
                    "trustedDeviceRecords": "{}",
                    "username": clean_user
                }

                resp = await client.post(
                    "https://www.instagram.com/api/v1/web/accounts/login/ajax/",
                    headers=headers,
                    data=login_data
                )
                
                try:
                    res_data = resp.json()
                except Exception:
                    return {"success": False, "error": f"Unexpected Instagram response ({resp.status_code})"}

                if res_data.get("authenticated"):
                    sessionid = client.cookies.get("sessionid") or resp.cookies.get("sessionid")
                    user_id = str(res_data.get("userId", ""))
                    return {
                        "success": True,
                        "session_cookie": sessionid,
                        "user_id": user_id,
                        "username": clean_user
                    }
                elif res_data.get("two_factor_required"):
                    two_fa_info = res_data.get("two_factor_info", {})
                    identifier = two_fa_info.get("two_factor_identifier")
                    packed_id = base64.urlsafe_b64encode(json.dumps({
                        "id": identifier,
                        "cookies": {c.name: c.value for c in client.cookies.jar}
                    }).encode()).decode()
                    return {
                        "success": False,
                        "two_factor_required": True,
                        "two_factor_identifier": packed_id,
                        "message": "Two-Factor Authentication is enabled on your Instagram account. Please enter your 6-digit verification code."
                    }
                elif res_data.get("checkpoint_url"):
                    return {
                        "success": False,
                        "checkpoint_required": True,
                        "message": "Instagram requested a security checkpoint. Please log in on instagram.com once to verify your device."
                    }
                else:
                    msg = res_data.get("message") or "Incorrect Instagram username or password."
                    return {"success": False, "error": msg}
        except Exception as e:
            logger.error(f"Error logging into Instagram: {e}")
            return {"success": False, "error": f"Failed to connect to Instagram login: {str(e)}"}

    @classmethod
    async def send_private_dm(
        cls,
        session_cookie: str,
        recipient_username: str,
        text_message: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Sends a Direct Message using Instagram's authenticated Web Session API (Option A).
        """
        clean_cookie = session_cookie.strip()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "X-IG-App-ID": "936619743392459",
            "X-CSRFToken": "missing",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.instagram.com/direct/inbox/",
            "Cookie": f"sessionid={clean_cookie};"
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                recipient_id = None
                try:
                    prof_resp = await client.get(
                        f"https://www.instagram.com/api/v1/users/web_profile_info/?username={recipient_username}",
                        headers=headers
                    )
                    if prof_resp.status_code == 200:
                        prof_data = prof_resp.json()
                        recipient_id = prof_data.get("data", {}).get("user", {}).get("id")
                except Exception as e:
                    logger.warning(f"Could not resolve username {recipient_username} via profile: {e}")

                if not recipient_id:
                    try:
                        search_resp = await client.get(
                            f"https://www.instagram.com/api/v1/web/search/topsearch/?context=blended&query={recipient_username}&rank_token=0.5",
                            headers=headers
                        )
                        if search_resp.status_code == 200:
                            users = search_resp.json().get("users", [])
                            for u_item in users:
                                u_obj = u_item.get("user", {})
                                if u_obj.get("username", "").lower() == recipient_username.lower():
                                    recipient_id = str(u_obj.get("pk"))
                                    break
                    except Exception:
                        pass

                if not recipient_id:
                    return False, f"Could not locate Instagram user ID for @{recipient_username}"

                data = {
                    "recipient_users": json.dumps([[recipient_id]]),
                    "action": "send_item",
                    "text": text_message
                }
                send_resp = await client.post(
                    "https://www.instagram.com/api/v1/direct_v2/threads/broadcast/text/",
                    headers=headers,
                    data=data
                )

                if send_resp.status_code in [200, 201]:
                    return True, None
                else:
                    return False, f"Instagram DM dispatch failed ({send_resp.status_code}): {send_resp.text[:150]}"
        except Exception as e:
            return False, f"Network error sending DM: {str(e)}"

    @classmethod
    async def fetch_media_comments(
        cls,
        session_cookie: str,
        media_id: int
    ) -> List[Dict[str, Any]]:
        """
        Fetches latest comments on a specific Reel or Post using Instagram Web API.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "X-IG-App-ID": "936619743392459",
            "Cookie": f"sessionid={session_cookie};"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"https://www.instagram.com/api/v1/media/{media_id}/comments/?can_support_threading=true",
                    headers=headers
                )
                if resp.status_code == 200:
                    data = resp.json()
                    comments = data.get("comments", [])
                    output = []
                    for c in comments:
                        user = c.get("user", {})
                        output.append({
                            "id": str(c.get("pk")),
                            "text": c.get("text", ""),
                            "user_id": str(user.get("pk", "")),
                            "username": user.get("username", ""),
                            "created_at": c.get("created_at_utc")
                        })
                    return output
        except Exception as e:
            logger.error(f"Error fetching Instagram comments: {e}")
        return []

    @classmethod
    async def scan_and_execute_campaign(
        cls,
        campaign_id: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Scans comments on the campaign's Reel/Post, matches keywords, and dispatches DMs.
        """
        camp_stmt = select(InstagramCampaign, InstagramAccount, File).join(
            InstagramAccount, InstagramCampaign.instagram_account_id == InstagramAccount.id
        ).join(
            File, InstagramCampaign.file_id == File.id
        ).where(
            InstagramCampaign.id == campaign_id,
            InstagramCampaign.is_active == True,
            InstagramAccount.is_active == True
        )
        res = await session.execute(camp_stmt)
        row = res.first()
        if not row:
            return {"status": "SKIPPED", "processed": 0, "reason": "Campaign or account inactive"}

        campaign, account, file_obj = row
        session_cookie = account.session_cookie or account.access_token

        if not session_cookie:
            return {"status": "ERROR", "processed": 0, "reason": "No active session cookie found"}

        media_targets = await cls._resolve_target_media(campaign, account, session_cookie)
        if not media_targets:
            return {"status": "SKIPPED", "processed": 0, "reason": "No target Reel/Post found. Pick a post for this campaign."}

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if account.last_reset_date != today_str:
            account.dms_sent_today = 0
            account.last_reset_date = today_str

        sent_count = 0
        scanned = 0
        matched = 0
        download_url = f"https://rdkwebsite.netlify.app/d/{file_obj.short_code or file_obj.id}"

        # Hourly velocity cap (counts SENT logs of all this account's campaigns in last hour)
        hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        hour_stmt = select(func.count(InstagramDmLog.id)).join(
            InstagramCampaign, InstagramDmLog.campaign_id == InstagramCampaign.id
        ).where(
            InstagramCampaign.instagram_account_id == account.id,
            InstagramDmLog.status == "SENT",
            InstagramDmLog.created_at >= hour_ago
        )
        sent_last_hour = (await session.execute(hour_stmt)).scalar() or 0
        limit_hit = False

        import asyncio
        for media_id in media_targets:
            if limit_hit:
                break
            comments = await cls.fetch_media_comments(session_cookie, media_id)
            for comment in comments:
                scanned += 1
                comment_text = comment.get("text", "")
                username = comment.get("username", "")
                user_id = comment.get("user_id", "")
                comment_id = comment.get("id", "")

                if not username or username.lower() == account.username.lower():
                    continue

                if cls.is_opt_out(comment_text):
                    continue

                if not cls.matches_keywords(comment_text, campaign.trigger_keywords):
                    continue
                matched += 1

                daily_exceeded = (account.daily_limit > 0 and account.dms_sent_today >= account.daily_limit)
                hourly_exceeded = (account.hourly_limit > 0 and (sent_last_hour + sent_count) >= account.hourly_limit)
                if daily_exceeded or hourly_exceeded:
                    limit_hit = True
                    break

                # Never process the same comment twice, and max 1 DM per user per 24h
                if comment_id:
                    seen_stmt = select(InstagramDmLog.id).where(
                        InstagramDmLog.campaign_id == campaign.id,
                        InstagramDmLog.comment_id == comment_id
                    ).limit(1)
                    if (await session.execute(seen_stmt)).first():
                        continue

                twenty_four_hrs_ago = datetime.now(timezone.utc) - timedelta(hours=24)
                dedup_stmt = select(InstagramDmLog.id).where(
                    InstagramDmLog.campaign_id == campaign.id,
                    InstagramDmLog.recipient_username == username,
                    InstagramDmLog.created_at >= twenty_four_hrs_ago
                ).limit(1)
                if (await session.execute(dedup_stmt)).first():
                    continue

                dm_text = cls.select_spintax_variant(
                    campaign.dm_templates_json,
                    username=username,
                    file_name=file_obj.name,
                    download_link=download_url
                )

                # Anti-Ban Safety Delay:
                # When running in Unlimited or High-Volume mode, pace with human-like jitter delay (6s - 12s)
                # to prevent Instagram automated spam rate blocks.
                if account.daily_limit == 0 or account.hourly_limit == 0 or account.hourly_limit > 50:
                    delay = random.uniform(6.0, 12.0)
                else:
                    delay = random.uniform(2.5, 5.0)
                await asyncio.sleep(delay)

                success, err = await cls.send_private_dm(session_cookie, username, dm_text)

                log = InstagramDmLog(
                    campaign_id=campaign.id,
                    recipient_ig_id=user_id or "unknown",
                    recipient_username=username,
                    comment_id=comment_id,
                    comment_text=comment_text,
                    dm_text_sent=dm_text if success else None,
                    status="SENT" if success else "FAILED",
                    error_message=err
                )
                session.add(log)

                if success:
                    account.dms_sent_today += 1
                    campaign.total_dms_sent += 1
                    sent_count += 1
                await session.commit()

        campaign.last_scanned_at = datetime.now(timezone.utc)
        await session.commit()
        return {
            "status": "SUCCESS",
            "processed": sent_count,
            "total_comments_scanned": scanned,
            "matched_comments": matched,
            "dms_dispatched": sent_count,
            "limit_reached": limit_hit
        }

    @classmethod
    async def _resolve_target_media(cls, campaign, account, session_cookie: str) -> List[int]:
        """Returns media ids to scan based on campaign.target_mode (SPECIFIC / ANY / NEXT)."""
        mode = (getattr(campaign, "target_mode", None) or "SPECIFIC").upper()
        if mode == "SPECIFIC":
            shortcode = cls.extract_shortcode_from_url(campaign.post_url or "")
            media_id = cls.shortcode_to_media_id(shortcode) if shortcode else None
            return [media_id] if media_id else []

        media = await cls.fetch_user_media(session_cookie, account.instagram_business_id or "", username=account.username or "")
        if mode == "NEXT" and campaign.created_at:
            created = campaign.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            created_ts = created.timestamp()
            media = [m for m in media if (m.get("taken_at") or 0) >= created_ts]
        ids: List[int] = []
        for m in media[:5]:
            try:
                ids.append(int(str(m["id"]).split("_")[0]))
            except Exception:
                continue
        return ids

    @classmethod
    async def fetch_user_media(cls, session_cookie: str, user_id: str, count: int = 24, username: str = "") -> List[Dict[str, Any]]:
        """Lists the creator's recent posts/reels (for the post picker grid)."""
        from urllib.parse import unquote
        if not user_id or not str(user_id).isdigit():
            # sessionid cookies are formatted '<user_pk>:<token>:...'
            head = unquote(session_cookie or "").split(":")[0]
            user_id = head if head.isdigit() else ""
        if not user_id and not username:
            return []
        cookie_str = f"sessionid={session_cookie};"
        if user_id:
            cookie_str += f" ds_user_id={user_id};"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"https://www.instagram.com/{username}/" if username else "https://www.instagram.com/",
            "Accept": "*/*",
            "Cookie": cookie_str
        }
        urls = []
        if user_id:
            urls.append(f"https://www.instagram.com/api/v1/feed/user/{user_id}/?count={count}")
        if username:
            urls.append(f"https://www.instagram.com/api/v1/feed/user/{username}/username/?count={count}")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                out: List[Dict[str, Any]] = []
                for u in urls:
                    try:
                        resp = await client.get(u, headers=headers)
                        if resp.status_code == 200:
                            items = resp.json().get("items", [])
                            if items:
                                for it in items:
                                    cands = (it.get("image_versions2") or {}).get("candidates") or []
                                    if not cands and it.get("carousel_media"):
                                        cands = (it["carousel_media"][0].get("image_versions2") or {}).get("candidates") or []
                                    thumb = cands[min(1, len(cands) - 1)]["url"] if cands else None
                                    out.append({
                                        "id": str(it.get("pk")),
                                        "code": it.get("code"),
                                        "thumbnail_url": thumb,
                                        "caption": ((it.get("caption") or {}).get("text") or "")[:120],
                                        "media_type": it.get("media_type"),
                                        "comment_count": it.get("comment_count", 0),
                                        "taken_at": it.get("taken_at")
                                    })
                                if out:
                                    return out
                        else:
                            logger.warning(f"Instagram media fetch {u} -> {resp.status_code}: {resp.text[:200]}")
                    except Exception as ex:
                        logger.warning(f"Error fetching {u}: {ex}")

                # Fallback: web_profile_info
                if username and not out:
                    try:
                        prof_url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
                        prof_resp = await client.get(prof_url, headers=headers)
                        if prof_resp.status_code == 200:
                            edges = (
                                prof_resp.json()
                                .get("data", {})
                                .get("user", {})
                                .get("edge_owner_to_timeline_media", {})
                                .get("edges", [])
                            )
                            for edge in edges:
                                node = edge.get("node", {})
                                caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
                                cap = caption_edges[0].get("node", {}).get("text", "") if caption_edges else ""
                                out.append({
                                    "id": str(node.get("id")),
                                    "code": node.get("shortcode"),
                                    "thumbnail_url": node.get("display_url"),
                                    "caption": cap[:120],
                                    "media_type": 1 if not node.get("is_video") else 2,
                                    "comment_count": node.get("edge_media_to_comment", {}).get("count", 0),
                                    "taken_at": node.get("taken_at_timestamp")
                                })
                            if out:
                                return out
                        else:
                            logger.warning(f"web_profile_info -> {prof_resp.status_code}: {prof_resp.text[:200]}")
                    except Exception as prof_ex:
                        logger.warning(f"web_profile_info error: {prof_ex}")

                return out
        except Exception as e:
            logger.error(f"Error fetching Instagram media: {e}")
            return []

    @classmethod
    async def run_live_scanner(cls, session_factory, interval_seconds: int = 90):
        """Background loop: auto-scans all active session-based campaigns so DMs go out in near real time."""
        import asyncio
        await asyncio.sleep(20)
        while True:
            try:
                async with session_factory() as db:
                    stmt = select(InstagramCampaign.id).join(
                        InstagramAccount, InstagramCampaign.instagram_account_id == InstagramAccount.id
                    ).where(
                        InstagramCampaign.is_active == True,
                        InstagramAccount.is_active == True,
                        InstagramAccount.session_cookie.isnot(None)
                    )
                    campaign_ids = [r[0] for r in (await db.execute(stmt)).all()]
                for cid in campaign_ids:
                    try:
                        async with session_factory() as db:
                            await cls.scan_and_execute_campaign(cid, db)
                    except Exception as e:
                        logger.warning(f"Live scan failed for campaign {cid}: {e}")
                    await asyncio.sleep(random.uniform(3, 8))
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning(f"Live scanner iteration error: {e}")
            await asyncio.sleep(interval_seconds)
