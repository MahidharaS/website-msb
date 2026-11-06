"""Private visitor memory in the owner's Google Drive (via the Apps Script in drive-history/).

When a visitor tells the assistant their name (and ideally email), their past chat summaries are
looked up and given to the model as private notes, so it can say "welcome back" and pick up the
thread. Notes are never quoted back word for word: someone typing another person's name must not
be able to read that person's earlier conversation.
"""
from __future__ import annotations

import logging
import re

import httpx

from . import config

log = logging.getLogger("ask-mahi.history")

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
NAME = re.compile(
    r"\b(?:my name is|i am|i'm|im|this is|call me)\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)", re.I
)
NOT_NAMES = {"a", "an", "the", "hiring", "looking", "interested", "from", "here", "just", "not", "recruiter", "with", "working"}


def enabled() -> bool:
    return bool(config.HISTORY_WEBHOOK_URL and config.HISTORY_SECRET)


def detect(text: str) -> dict[str, str]:
    found: dict[str, str] = {}
    if m := EMAIL.search(text):
        found["email"] = m.group(0).lower().rstrip(".")
    if m := NAME.search(text):
        name = m.group(1).strip()
        if name.split()[0].lower() not in NOT_NAMES:
            found["name"] = " ".join(w.capitalize() for w in name.split())
    return found


def visitor_key(name: str = "", email: str = "") -> str:
    if email:
        return email.lower()
    return re.sub(r"\s+", "-", name.strip().lower())


async def _call(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
        r = await c.post(config.HISTORY_WEBHOOK_URL, json={**payload, "secret": config.HISTORY_SECRET})
        return r.json()


async def lookup(name: str = "", email: str = "") -> str:
    """Private notes about a returning visitor ('' if none)."""
    if not enabled() or not (name or email):
        return ""
    try:
        rec = (await _call({"action": "lookup", "visitor_key": visitor_key(name, email)})).get("record")
    except Exception as e:
        log.warning("history lookup failed: %s", e)
        return ""
    if not rec or not rec.get("conversations"):
        return ""
    # matching on name alone is weak: if we hold an email for them and it wasn't given, stay vague
    if rec.get("email") and not email:
        return (
            f"Someone named {rec.get('name') or name} has chatted before, but this visitor has not "
            "confirmed their email, so do NOT mention any earlier details. You may ask for their email "
            "to pick up where they left off."
        )
    notes = "\n".join(f"- {c.get('date', '')}: {c.get('summary', '')[:600]}" for c in rec["conversations"][-5:])
    return f"Returning visitor {rec.get('name') or name}. Earlier conversations (summaries):\n{notes}"


async def save(name: str, email: str, date: str, summary: str, transcript: str) -> None:
    if not enabled() or not (name or email):
        return
    # stored under the email and under the name, so a returning visitor is found either way
    keys = {visitor_key(name, email), visitor_key(name, "")} - {""}
    for key in keys:
        try:
            await _call({
                "action": "save", "visitor_key": key, "name": name, "email": email,
                "date": date, "summary": summary, "transcript": transcript[:20000],
            })
        except Exception as e:
            log.warning("history save failed: %s", e)
