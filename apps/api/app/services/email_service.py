import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("rage.email")

class EmailService:
    @staticmethod
    def _send_smtp(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
        """Synchronous SMTP sender connected to GoDaddy SSL port 465"""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            if html_content:
                msg.attach(MIMEText(html_content, "html", "utf-8"))

            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=20) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

            logger.info(f"Email sent successfully to {to_email} with subject '{subject}'")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    @classmethod
    async def send_email_async(cls, to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
        """Non-blocking email dispatcher run in threadpool"""
        try:
            return await asyncio.to_thread(cls._send_smtp, to_email, subject, html_content, text_content)
        except Exception as e:
            logger.error(f"Error in async email dispatch: {e}")
            return False

    @classmethod
    async def send_welcome_email(cls, to_email: str, user_name: str):
        """Sends welcome email with creator offers and perks upon signup"""
        subject = "Welcome to RAGE CLOUD - Your 10 GB Free Vault & Creator Offers Inside!"
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }}
    .header {{ background: linear-gradient(135deg, #0b0f19 0%, #1e1b4b 100%); padding: 36px 30px; text-align: center; border-bottom: 1px solid rgba(244,63,94,0.3); }}
    .logo {{ font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin: 0; }}
    .logo span {{ color: #f43f5e; }}
    .tagline {{ font-size: 11px; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; }}
    .content {{ padding: 32px 30px; line-height: 1.6; color: #cbd5e1; font-size: 14px; }}
    .greeting {{ font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }}
    .perk-box {{ background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 12px; padding: 20px; margin: 24px 0; }}
    .perk-title {{ font-size: 14px; font-weight: 800; color: #f43f5e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }}
    .perk-list {{ list-style: none; padding: 0; margin: 0; }}
    .perk-list li {{ padding: 6px 0; display: flex; align-items: center; font-size: 13px; color: #e2e8f0; }}
    .plan-card {{ background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; margin: 12px 0; }}
    .btn {{ display: inline-block; background: #f43f5e; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }}
    .footer {{ background: #080b12; padding: 24px 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.06); }}
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="container">
      <div class="header">
        <div class="logo">RAGE <span>CLOUD</span></div>
        <div class="tagline">Next-Gen Monetized Creator Cloud</div>
      </div>
      <div class="content">
        <div class="greeting">Hey {user_name or 'Creator'}, Welcome to the Family! 👑</div>
        <p>Your RAGE CLOUD account has been successfully created. We're thrilled to have you on board the edge CDN network built for gaming, modding, and digital creators.</p>
        
        <div class="perk-box">
          <div class="perk-title">Your Active Starter Perks</div>
          <ul class="perk-list">
            <li>✅ <strong>10 GB Free Storage Quota:</strong> Automatically active in your vault.</li>
            <li>✅ <strong>Instant Monetization:</strong> Earn ₹300-₹500 per 1,000 qualified downloads.</li>
            <li>✅ <strong>Fast UPI Payouts:</strong> Direct settlements to PhonePe, Google Pay & Paytm.</li>
            <li>✅ <strong>Google Drive High-Speed CDN:</strong> Zero wait times for your viewers.</li>
          </ul>
        </div>

        <div style="margin-top: 28px;">
          <h4 style="color: #ffffff; margin-bottom: 8px;">Upgrade Offers Available:</h4>
          <div class="plan-card">
            <strong style="color: #38bdf8;">⚡ Pro Gamer Plan:</strong> <strong>20 GB Storage</strong> for only <strong>₹300 / month</strong> (Ad-free download pages for your audience & turbo speed).
          </div>
          <div class="plan-card">
            <strong style="color: #ec4899;">🚀 Creator Studio Plan:</strong> <strong>50 GB Storage</strong> for only <strong>₹800 / month</strong> (Highest revenue splits, custom branding & VIP support).
          </div>
        </div>

        <div style="text-align: center;">
          <a href="https://ragefps.in/dashboard" class="btn">Launch Your Dashboard</a>
        </div>
      </div>
      <div class="footer">
        &copy; 2026 RAGE CLOUD Platform &bull; Support: support@ragefps.in<br>
        Built for creators, driven by speed.
      </div>
    </div>
  </div>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html)

    @classmethod
    async def send_otp_email(cls, to_email: str, otp_code: str):
        """Sends 6-digit OTP verification email for Password Reset"""
        subject = f"{otp_code} is your RAGE CLOUD Password Reset Code"
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 0; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }}
    .header {{ background: #080b12; padding: 28px; text-align: center; border-bottom: 1px solid rgba(244,63,94,0.3); }}
    .logo {{ font-size: 22px; font-weight: 900; color: #ffffff; }}
    .logo span {{ color: #f43f5e; }}
    .content {{ padding: 32px 28px; text-align: center; color: #cbd5e1; }}
    .otp-box {{ background: rgba(244,63,94,0.1); border: 2px dashed #f43f5e; border-radius: 12px; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ffffff; padding: 18px 24px; margin: 24px 0; font-family: monospace; display: inline-block; }}
    .footer {{ background: #080b12; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }}
  </style>
</head>
<body>
  <div style="padding: 24px 10px;">
    <div class="container">
      <div class="header">
        <div class="logo">RAGE <span>CLOUD</span></div>
      </div>
      <div class="content">
        <h3 style="color: #ffffff; margin-top: 0;">Password Reset Request</h3>
        <p style="font-size: 13px;">We received a request to reset your password. Use the verification code below to complete your reset:</p>
        <div class="otp-box">{otp_code}</div>
        <p style="font-size: 12px; color: #94a3b8;">This code will expire in <strong>15 minutes</strong>. If you did not request this, please ignore this email.</p>
      </div>
      <div class="footer">
        &copy; 2026 RAGE CLOUD &bull; support@ragefps.in
      </div>
    </div>
  </div>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html)

    @classmethod
    async def send_subscription_approved_email(cls, to_email: str, user_name: str, plan_name: str, storage_gb: int):
        """Sends email confirmation when the owner approves a QR subscription"""
        subject = f"Payment Verified! Your {plan_name} ({storage_gb} GB) is Now Active! 🚀"
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 0; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(16,185,129,0.3); }}
    .header {{ background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 32px 24px; text-align: center; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }}
    .badge {{ display: inline-block; background: #10b981; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px; }}
    .btn {{ display: inline-block; background: #10b981; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 20px; }}
    .footer {{ background: #080b12; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }}
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="container">
      <div class="header">
        <div class="badge">Payment Verified by Owner</div>
        <h2 style="color: #ffffff; margin: 0;">Subscription Activated!</h2>
      </div>
      <div class="content">
        <p>Hey <strong>{user_name or 'Creator'}</strong>,</p>
        <p>Your UPI payment proof has been reviewed and verified by our administration team. Your plan upgrade is officially live!</p>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 16px; font-weight: 800; color: #ffffff;">{plan_name}</div>
          <div style="font-size: 13px; color: #34d399; margin-top: 6px;">New Cloud Vault Limit: <strong>{storage_gb} GB</strong></div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Status: <strong>Active (30 Days)</strong></div>
        </div>
        <p>You can now upload larger files, enjoy high-speed distribution, and leverage enhanced monetization splits.</p>
        <div style="text-align: center;">
          <a href="https://ragefps.in/dashboard" class="btn">Go to Your Vault</a>
        </div>
      </div>
      <div class="footer">
        &copy; 2026 RAGE CLOUD &bull; support@ragefps.in
      </div>
    </div>
  </div>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html)

    @classmethod
    async def send_subscription_rejected_email(cls, to_email: str, user_name: str, plan_name: str, reason: str = ""):
        """Sends email when subscription payment proof could not be verified"""
        subject = f"Update on your {plan_name} Subscription Request"
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 0; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(244,63,94,0.3); }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }}
    .footer {{ background: #080b12; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }}
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="container">
      <div style="background: #881337; padding: 24px; text-align: center;">
        <h3 style="color: #ffffff; margin: 0;">Subscription Verification Update</h3>
      </div>
      <div class="content">
        <p>Hey <strong>{user_name or 'Creator'}</strong>,</p>
        <p>Our administration team reviewed your payment submission for the <strong>{plan_name}</strong> plan, but could not verify the transaction.</p>
        <div style="background: rgba(244,63,94,0.1); border-left: 4px solid #f43f5e; padding: 12px 16px; margin: 18px 0; font-size: 13px;">
          <strong>Reason:</strong> {reason or "Transaction reference / UTR not found or screenshot was unclear."}
        </div>
        <p>If you have already transferred the funds, please reply directly to this email at <a href="mailto:support@ragefps.in" style="color: #f43f5e;">support@ragefps.in</a> with your bank reference or re-upload your proof on the Pricing page.</p>
      </div>
      <div class="footer">
        &copy; 2026 RAGE CLOUD &bull; support@ragefps.in
      </div>
    </div>
  </div>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html)
