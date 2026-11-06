"""Send email to Mahidhara. Uses Resend (simple HTTPS API) if RESEND_API_KEY is set,
otherwise SMTP (e.g. a Gmail app password). If neither is set, emails are only logged."""
from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

import httpx

from . import config

log = logging.getLogger("ask-mahi.mail")


def configured() -> bool:
    return bool(config.RESEND_API_KEY or (config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASS))


async def send(subject: str, text: str, reply_to: str | None = None) -> bool:
    if config.RESEND_API_KEY:
        payload = {"from": config.MAIL_FROM, "to": [config.NOTIFY_EMAIL], "subject": subject, "text": text}
        if reply_to:
            payload["reply_to"] = reply_to
        try:
            async with httpx.AsyncClient(timeout=20) as c:
                r = await c.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
                    json=payload,
                )
            if r.status_code < 300:
                return True
            log.warning("resend %s: %s", r.status_code, r.text[:300])
            return False
        except Exception as e:
            log.warning("resend failed: %s", e)
            return False
    if config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASS:
        def _smtp() -> bool:
            msg = EmailMessage()
            msg["Subject"], msg["From"], msg["To"] = subject, config.SMTP_USER, config.NOTIFY_EMAIL
            if reply_to:
                msg["Reply-To"] = reply_to
            msg.set_content(text)
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as s:
                s.starttls()
                s.login(config.SMTP_USER, config.SMTP_PASS)
                s.send_message(msg)
            return True

        try:
            return await asyncio.to_thread(_smtp)
        except Exception as e:
            log.warning("smtp failed: %s", e)
            return False
    log.info("EMAIL (not sent, no mail provider configured)\nSubject: %s\n%s", subject, text)
    return False
