"""Keep each visitor's chat and email it to Mahidhara when the conversation ends.

A conversation ends when the browser tab closes (the site sends /chat/end), or after
CHAT_IDLE_MINUTES without a new message. Kept in memory: a restart before the idle timer
fires can lose an in-progress transcript, which is acceptable for a portfolio.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from . import config, mailer
from .agent import summarize

log = logging.getLogger("ask-mahi.sessions")


@dataclass
class Session:
    id: str
    started: float = field(default_factory=time.time)
    last: float = field(default_factory=time.time)
    turns: list[tuple[str, str]] = field(default_factory=list)
    meta: dict = field(default_factory=dict)
    sent_upto: int = 0


SESSIONS: dict[str, Session] = {}


def record(session_id: str, role: str, content: str, meta: dict | None = None) -> None:
    s = SESSIONS.setdefault(session_id, Session(id=session_id))
    s.turns.append((role, content))
    s.last = time.time()
    if meta:
        s.meta.update({k: v for k, v in meta.items() if v})


def transcript(s: Session, start: int = 0) -> str:
    return "\n\n".join(f"{'VISITOR' if r == 'user' else 'MAHI AI'}: {c}" for r, c in s.turns[start:])


async def flush(session_id: str, reason: str) -> bool:
    s = SESSIONS.get(session_id)
    if not s or len(s.turns) <= s.sent_upto:
        return False
    start = s.sent_upto
    s.sent_upto = len(s.turns)
    questions = sum(1 for r, _ in s.turns[start:] if r == "user")
    if questions == 0:
        return False
    text_ = transcript(s, start)
    summary = await summarize(text_)
    when = datetime.fromtimestamp(s.started, tz=timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    first_q = next((c for r, c in s.turns[start:] if r == "user"), "")[:70]
    meta = "\n".join(f"{k}: {v}" for k, v in s.meta.items())
    body = (
        f"Someone chatted with Mahi AI on your portfolio.\n\n"
        f"Started: {when}\nQuestions asked: {questions}\nEnded because: {reason}\nSession: {s.id}\n"
        f"{meta}\n\n"
        f"SUMMARY\n-------\n{summary}\n\n"
        f"FULL TRANSCRIPT\n---------------\n{text_}\n"
    )
    ok = await mailer.send(f"Portfolio chat: “{first_q}”", body)
    log.info("chat %s emailed=%s (%s)", s.id, ok, reason)
    return ok


async def idle_watcher() -> None:
    while True:
        await asyncio.sleep(60)
        cutoff = time.time() - config.CHAT_IDLE_MINUTES * 60
        for sid, s in list(SESSIONS.items()):
            if s.last < cutoff:
                try:
                    await flush(sid, f"no new message for {config.CHAT_IDLE_MINUTES:g} minutes")
                finally:
                    SESSIONS.pop(sid, None)
