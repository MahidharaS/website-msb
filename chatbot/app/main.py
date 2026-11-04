"""Ask Mahi API: FastAPI + Server-Sent Events.

POST /chat/stream  {message, history, session_id} -> text/event-stream of JSON events
POST /chat         same body -> {answer, sources}
GET  /health
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import config, rag

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ask-mahi")

app = FastAPI(title="Ask Mahi", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


class Turn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1200)
    history: list[Turn] = Field(default_factory=list, max_length=20)
    session_id: str = Field(default="anonymous", max_length=64)


_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0]
    now, q = time.time(), _hits[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= config.RATE_LIMIT:
        raise HTTPException(429, "Too many questions in a minute. Please slow down.")
    q.append(now)


def log_turn(session_id: str, role: str, content: str, sources: list | None = None) -> None:
    client = rag.supabase_client()
    if client is None or not config.LOG_CHATS:
        return
    try:
        client.table("chat_messages").insert(
            {"session_id": session_id, "role": role, "content": content[:8000], "sources": sources or []}
        ).execute()
    except Exception as e:  # logging must never break the chat
        log.warning("chat log failed: %s", e)


@app.on_event("startup")
async def warm() -> None:
    # build the index / load the embedding model before the first visitor arrives
    await asyncio.to_thread(rag.vector_store)


@app.get("/health")
async def health():
    return {"ok": True, "model": config.LLM_MODEL, "store": "supabase" if rag.supabase_client() else "memory"}


@app.post("/chat/stream")
async def chat_stream(body: ChatRequest, request: Request):
    rate_limit(request)
    history = [t.model_dump() for t in body.history]

    async def events():
        answer, sources = "", []
        try:
            async for ev in rag.answer_stream(body.message, history):
                if ev["type"] == "token":
                    answer += ev["content"]
                elif ev["type"] == "sources":
                    sources = ev["sources"]
                yield f"data: {json.dumps(ev)}\n\n"
        except Exception as e:
            log.exception("stream failed")
            yield f"data: {json.dumps({'type': 'error', 'message': 'The model is unavailable right now.'})}\n\n"
            answer = answer or f"[error] {e}"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        await asyncio.to_thread(log_turn, body.session_id, "user", body.message)
        await asyncio.to_thread(log_turn, body.session_id, "assistant", answer, sources)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/chat")
async def chat(body: ChatRequest, request: Request):
    rate_limit(request)
    history = [t.model_dump() for t in body.history]
    answer, sources = "", []
    async for ev in rag.answer_stream(body.message, history):
        if ev["type"] == "token":
            answer += ev["content"]
        elif ev["type"] == "sources":
            sources = ev["sources"]
    return {"answer": answer, "sources": sources}
