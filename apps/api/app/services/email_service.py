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
        """Synchronous SMTP sender with dual-port fallback (465 SSL and 587 STARTTLS)"""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        raw_msg = msg.as_string()
        primary_port = int(settings.SMTP_PORT)
        fallback_port = 587 if primary_port == 465 else 465

        # Attempt 1: Primary Port
        try:
            context = ssl.create_default_context()
            if primary_port == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, primary_port, context=context, timeout=12) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], raw_msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, primary_port, timeout=12) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], raw_msg)

            logger.info(f"Email sent successfully to {to_email} via port {primary_port} with subject '{subject}'")
            return True
        except Exception as err1:
            logger.warning(f"Primary SMTP attempt on port {primary_port} failed ({err1}). Retrying on fallback port {fallback_port}...")

        # Attempt 2: Fallback Port
        try:
            context = ssl.create_default_context()
            if fallback_port == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, fallback_port, context=context, timeout=12) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], raw_msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, fallback_port, timeout=12) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], raw_msg)

            logger.info(f"Email sent successfully to {to_email} via fallback port {fallback_port} with subject '{subject}'")
            return True
        except Exception as err2:
            logger.error(f"Failed to send email to {to_email} on both ports {primary_port} and {fallback_port}: {err2}")
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
        """Sends formal welcome email upon signup"""
        subject = "Welcome to RAGE Cloud"
        greeting = f"Dear {user_name}," if user_name else "Hello,"
        text = f"""{greeting}

Thank you for creating an account with RAGE Cloud. Your 10 GB free cloud storage vault is now active.

You can access your account dashboard here:
https://rdkcloudservices.netlify.app/dashboard

If you have any questions or require assistance, please reply to this email or contact support at support@ragefps.in.

Regards,
RAGE Cloud Team
support@ragefps.in
"""
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; background-color: #ffffff; margin: 0; padding: 24px;">
  <p>{greeting}</p>
  <p>Thank you for creating an account with RAGE Cloud. Your 10 GB free cloud storage vault is now active.</p>
  <p>You can access your account and manage your files at:<br>
  <a href="https://rdkcloudservices.netlify.app/dashboard" style="color: #0066cc; text-decoration: underline;">https://rdkcloudservices.netlify.app/dashboard</a></p>
  <p>If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:support@ragefps.in" style="color: #0066cc;">support@ragefps.in</a>.</p>
  <br>
  <p style="color: #333333; margin: 0;">
    Regards,<br>
    <strong>RAGE Cloud Team</strong><br>
    <a href="mailto:support@ragefps.in" style="color: #0066cc; text-decoration: none;">support@ragefps.in</a>
  </p>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html, text)

    @classmethod
    async def send_otp_email(cls, to_email: str, otp_code: str) -> bool:
        """Sends formal OTP verification email for Password Reset without boxes or dark UI"""
        subject = f"{otp_code} is your RAGE Cloud verification code"
        text = f"""Hello,

We received a request to reset your password. Use the verification code below to proceed:

{otp_code}

This code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.

Regards,
RAGE Cloud Support
support@ragefps.in
"""
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; background-color: #ffffff; margin: 0; padding: 24px;">
  <p>Hello,</p>
  <p>We received a request to reset the password for your RAGE Cloud account. Please use the verification code below:</p>
  <p style="font-size: 26px; font-weight: bold; letter-spacing: 5px; color: #111111; margin: 18px 0;">{otp_code}</p>
  <p style="color: #555555; font-size: 13px;">This code is valid for 15 minutes. If you did not request a password reset, you can safely disregard this email.</p>
  <br>
  <p style="color: #333333; margin: 0;">
    Regards,<br>
    <strong>RAGE Cloud Support</strong><br>
    <a href="mailto:support@ragefps.in" style="color: #0066cc; text-decoration: none;">support@ragefps.in</a>
  </p>
</body>
</html>"""
        return await cls.send_email_async(to_email, subject, html, text)

    @classmethod
    async def send_subscription_approved_email(cls, to_email: str, user_name: str, plan_name: str, storage_gb: int):
        """Sends formal confirmation when subscription is approved"""
        subject = f"Your {plan_name} subscription is now active"
        greeting = f"Dear {user_name}," if user_name else "Hello,"
        text = f"""{greeting}

We have verified your payment. Your {plan_name} subscription ({storage_gb} GB cloud storage) is now active on your account.

You can view your updated vault and manage your files at:
https://rdkcloudservices.netlify.app/dashboard

Thank you for choosing RAGE Cloud.

Regards,
RAGE Cloud Team
support@ragefps.in
"""
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; background-color: #ffffff; margin: 0; padding: 24px;">
  <p>{greeting}</p>
  <p>We have verified your payment. Your <strong>{plan_name}</strong> subscription (<strong>{storage_gb} GB</strong> cloud storage) is now active on your account.</p>
  <p>You can view your updated vault and manage your files at:<br>
  <a href="https://rdkcloudservices.netlify.app/dashboard" style="color: #0066cc; text-decoration: underline;">https://rdkcloudservices.netlify.app/dashboard</a></p>
  <br>
  <p style="color: #333333; margin: 0;">
    Regards,<br>
    <strong>RAGE Cloud Team</strong><br>
    <a href="mailto:support@ragefps.in" style="color: #0066cc; text-decoration: none;">support@ragefps.in</a>
  </p>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html, text)

    @classmethod
    async def send_subscription_rejected_email(cls, to_email: str, user_name: str, plan_name: str, reason: str = ""):
        """Sends formal update regarding payment verification"""
        subject = f"Update regarding your {plan_name} subscription request"
        greeting = f"Dear {user_name}," if user_name else "Hello,"
        reason_text = reason or "Transaction reference / UTR could not be verified."
        text = f"""{greeting}

We were unable to verify the payment submission for your {plan_name} subscription request.

Reason: {reason_text}

If you have already transferred the funds, please reply to this email or contact us at support@ragefps.in with your payment reference or transaction screenshot.

Regards,
RAGE Cloud Team
support@ragefps.in
"""
        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; background-color: #ffffff; margin: 0; padding: 24px;">
  <p>{greeting}</p>
  <p>We were unable to verify the payment submission for your <strong>{plan_name}</strong> subscription request.</p>
  <p><strong>Reason:</strong> {reason_text}</p>
  <p>If you have already completed the transaction, please reply to this email or contact us at <a href="mailto:support@ragefps.in" style="color: #0066cc;">support@ragefps.in</a> with your payment reference so our team can assist you.</p>
  <br>
  <p style="color: #333333; margin: 0;">
    Regards,<br>
    <strong>RAGE Cloud Team</strong><br>
    <a href="mailto:support@ragefps.in" style="color: #0066cc; text-decoration: none;">support@ragefps.in</a>
  </p>
</body>
</html>"""
        await cls.send_email_async(to_email, subject, html, text)
