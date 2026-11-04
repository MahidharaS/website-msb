"""Ask Mahi API.

GET  /health                    status, model, knowledge source
POST /chat/stream               {message, history, session_id, meta} → SSE of JSON events
POST /chat/end                  {session_id}  (sent by the browser when the tab closes)
POST /contact                   contact form → email to Mahidhara
GET  /admin                     owner page: connect the Google Drive folder, sync, test email
     /mcp/                      read-only MCP server with the portfolio tools
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import config, mailer, sessions
from .agent import answer_stream
from .knowledge import store
from .mcp_server import mcp

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ask-mahi")

mcp.settings.streamable_http_path = "/"
mcp_app = mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await store.refresh(force=True)
    except Exception as e:
        log.warning("initial knowledge load failed: %s", e)
    watcher = asyncio.create_task(sessions.idle_watcher())
    async with mcp.session_manager.run():
        yield
    watcher.cancel()
    for sid in list(sessions.SESSIONS):
        await sessions.flush(sid, "server shutting down")


app = FastAPI(title="Ask Mahi", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization", "Mcp-Session-Id"],
)
app.mount("/mcp", mcp_app)


# ---------------------------------------------------------------- helpers
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request, bucket: str = "chat", limit: int | None = None) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0]
    key, now = f"{bucket}:{ip}", time.time()
    q = _hits[key]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= (limit or config.RATE_LIMIT):
        raise HTTPException(429, "Too many requests in a minute. Please slow down.")
    q.append(now)


def check_admin(token: str | None) -> None:
    if not config.ADMIN_TOKEN:
        raise HTTPException(403, "Set ADMIN_TOKEN in the environment to use the admin page.")
    if (token or "").removeprefix("Bearer ").strip() != config.ADMIN_TOKEN:
        raise HTTPException(401, "Wrong admin token.")


class Turn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1200)
    history: list[Turn] = Field(default_factory=list, max_length=20)
    session_id: str = Field(default="anonymous", max_length=64)
    meta: dict[str, str] = Field(default_factory=dict)


class ContactRequest(BaseModel):
    who: str = Field(default="", max_length=60)
    areas: list[str] = Field(default_factory=list, max_length=10)
    message: str = Field(min_length=1, max_length=5000)
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    session_id: str = Field(default="", max_length=64)
    meta: dict[str, str] = Field(default_factory=dict)
    website: str = ""  # honeypot: humans never fill this


def _meta(meta: dict[str, str], request: Request) -> dict[str, str]:
    keep = {k: str(v)[:200] for k, v in meta.items() if k in {"page", "referrer", "language", "timezone", "screen"}}
    keep["user_agent"] = request.headers.get("user-agent", "")[:200]
    return keep


# ---------------------------------------------------------------- public API
@app.get("/health")
async def health():
    return {
        "ok": True,
        "model": config.LLM_MODEL,
        "llm_key": bool(config.LLM_API_KEY),
        "knowledge": {"source": store.source, "entries": len(store.entries), "error": store.error or None},
        "email": mailer.configured(),
    }


@app.post("/chat/stream")
async def chat_stream(body: ChatRequest, request: Request):
    rate_limit(request)
    history = [t.model_dump() for t in body.history]
    sessions.record(body.session_id, "user", body.message, _meta(body.meta, request))

    async def events():
        answer = ""
        try:
            async for ev in answer_stream(body.message, history):
                if ev["type"] == "token":
                    answer += ev["content"]
                yield f"data: {json.dumps(ev)}\n\n"
        except Exception:
            log.exception("stream failed")
            yield f"data: {json.dumps({'type': 'error', 'message': 'The model is unavailable right now.'})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        sessions.record(body.session_id, "assistant", answer or "[no answer: model unavailable]")

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/chat/end")
async def chat_end(request: Request):
    # sent with navigator.sendBeacon, so the body may arrive as text/plain
    try:
        sid = str(json.loads(await request.body()).get("session_id", ""))[:64]
    except Exception:
        raise HTTPException(400, "Expected {session_id}")
    if sid:
        asyncio.create_task(sessions.flush(sid, "visitor closed the chat"))
    return {"ok": True}


@app.post("/contact")
async def contact(body: ContactRequest, request: Request):
    rate_limit(request, "contact", 5)
    if body.website:
        return {"ok": True, "delivered": True}  # bot; pretend success
    when = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    m = _meta(body.meta, request)
    chat = ""
    s = sessions.SESSIONS.get(body.session_id) if body.session_id else None
    if s and s.turns:
        chat = "\n\nTHEY ALSO CHATTED WITH MAHI AI\n------------------------------\n" + sessions.transcript(s)
    text = (
        f"New message from your portfolio contact form.\n\n"
        f"From:      {body.name} <{body.email}>\n"
        f"They are:  {body.who or '—'}\n"
        f"Areas:     {', '.join(body.areas) or '—'}\n"
        f"Received:  {when}\n"
        f"Page:      {m.get('page', '—')}\n"
        f"Came from: {m.get('referrer') or 'direct'}\n"
        f"Timezone:  {m.get('timezone', '—')}  ·  Language: {m.get('language', '—')}\n\n"
        f"MESSAGE\n-------\n{body.message}\n"
        f"{chat}\n\n"
        f"Reply to this email to answer {body.name.split(' ')[0]} directly."
    )
    ok = await mailer.send(f"Portfolio: {body.who or 'New contact'} — {body.name}", text, reply_to=body.email)
    return {"ok": True, "delivered": ok}


# ---------------------------------------------------------------- owner admin
@app.get("/admin", response_class=HTMLResponse)
async def admin_page():
    return (Path(__file__).parent / "admin.html").read_text(encoding="utf-8")


class FolderRequest(BaseModel):
    folder_url: str = Field(default="", max_length=500)


@app.get("/admin/api/status")
async def admin_status(authorization: str | None = Header(default=None)):
    check_admin(authorization)
    return {
        "folder_url": store.folder_url,
        "source": store.source,
        "error": store.error or None,
        "entries": [{"type": e.type, "title": e.title, "source": e.source} for e in store.entries],
        "loaded_at": store.loaded_at,
        "model": config.LLM_MODEL,
        "llm_key": bool(config.LLM_API_KEY),
        "email": mailer.configured(),
        "notify": config.NOTIFY_EMAIL,
    }


@app.post("/admin/api/folder")
async def admin_folder(body: FolderRequest, authorization: str | None = Header(default=None)):
    check_admin(authorization)
    store.folder_url = body.folder_url.strip()
    await store.refresh(force=True)
    return await admin_status(authorization)


@app.post("/admin/api/sync")
async def admin_sync(authorization: str | None = Header(default=None)):
    check_admin(authorization)
    await store.refresh(force=True)
    return await admin_status(authorization)


@app.post("/admin/api/test-email")
async def admin_test_email(authorization: str | None = Header(default=None)):
    check_admin(authorization)
    ok = await mailer.send("Portfolio: test email", "If you can read this, contact and chat emails will reach you.")
    return {"delivered": ok}
