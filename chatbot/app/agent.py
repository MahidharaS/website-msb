"""Answering with Nemotron (or any OpenAI-compatible model) plus the portfolio tools.

1. The question is pre-searched so the model always starts with relevant facts.
2. The model may call the portfolio tools (the same ones the MCP server exposes) up to 3 times.
3. The final answer is streamed token by token, followed by the sources used.
If the model or endpoint doesn't support tool calling, it falls back to plain retrieval.
"""
from __future__ import annotations

import json
import logging
import re
from typing import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI

from . import config
from .knowledge import store
from .tools import TOOLS

log = logging.getLogger("ask-mahi.agent")

SYSTEM = """You are Mahidhara S. (Mahi) answering visitors on your own portfolio website: an analyst \
who became an ML engineer and is moving into data science, based in Bangalore. Speak as yourself, \
in the first person ("I built...", "my team..."), warm, direct and concrete, like you are talking to \
a recruiter or a founder over coffee.

Rules:
- Use only facts from the context and tool results. If something isn't there, say you'd rather \
answer that personally and invite them to email mahidhara.s@outlook.com. Never invent employers, \
numbers, dates, tools or credentials.
- Lead with the business outcome, then how you did it.
- Keep answers under 170 words unless asked for detail. Short paragraphs or a few bullets. No tables.
- Model internals at your employer are confidential: describe outcomes, not proprietary details.
- If someone asks whether they are talking to a bot or to you, be honest: you are an AI version of \
Mahidhara, trained on his portfolio, and the real Mahidhara reads these chats and follows up.
- Politely steer anything unrelated back to your work, hiring or skills.
- If the visitor shares their name, company or email, thank them warmly in one short line and \
carry on with their question. Never ask for contact details yourself and never insist.
{voice}
Context found for this question:
{context}"""

THINK = re.compile(r"<think>.*?</think>", re.S)


def llm() -> ChatOpenAI:
    return ChatOpenAI(
        base_url=config.LLM_BASE_URL,
        api_key=config.LLM_API_KEY or "missing-key",
        model=config.LLM_MODEL,
        temperature=config.LLM_TEMPERATURE,
        max_tokens=config.LLM_MAX_TOKENS,
        timeout=90,
        extra_body=config.LLM_EXTRA_BODY or None,
    )


def lc_tools() -> list[StructuredTool]:
    return [StructuredTool.from_function(coroutine=fn, name=fn.__name__, description=fn.__doc__ or "") for fn in TOOLS]


def _sources(entries) -> list[dict]:
    seen, out = set(), []
    for e in entries:
        if e.title in seen:
            continue
        seen.add(e.title)
        out.append({"title": e.title, "url": e.url or None})
    return out[:4]


async def answer_stream(question: str, history: list[dict], visitor_notes: str = "") -> AsyncIterator[dict]:
    await store.refresh()
    prior = next((h["content"] for h in reversed(history) if h.get("role") == "user"), "")
    query = f"{prior}\n{question}" if prior and len(question) < 60 else question
    found = store.search(query)
    used = list(found)
    context = "\n\n---\n\n".join(e.text() for e in found) or "(nothing matched; use the tools)"

    voice = "\n".join(f"- {e.summary} {e.details}".strip() for e in store.by_type("voice"))
    system = SYSTEM.format(context=context, voice=f"\nHow I talk (from my own notes):\n{voice}\n" if voice else "")
    if visitor_notes:
        system += (
            "\n\nPRIVATE NOTES about this visitor (from earlier visits). Use them to welcome them back and "
            "avoid re-asking, but never quote or list them; only refer to things the visitor brings up "
            "themselves:\n" + visitor_notes
        )
    messages = [SystemMessage(system)]
    for h in history[-8:]:
        c = str(h.get("content", ""))[:2000]
        messages.append(HumanMessage(c) if h.get("role") == "user" else AIMessage(c))
    messages.append(HumanMessage(question))

    model = llm()
    tools = {t.name: t for t in lc_tools()}
    try:
        bound = model.bind_tools(list(tools.values()))
        for _ in range(3):
            reply = await bound.ainvoke(messages)
            if not getattr(reply, "tool_calls", None):
                break
            messages.append(reply)
            for call in reply.tool_calls:
                tool = tools.get(call["name"])
                result = await tool.ainvoke(call.get("args") or {}) if tool else "[]"
                try:
                    for d in json.loads(result):
                        used.extend(e for e in store.entries if e.title == d.get("title"))
                except Exception:
                    pass
                messages.append(ToolMessage(content=str(result)[:6000], tool_call_id=call["id"]))
    except Exception as e:  # endpoint without tool support: plain retrieval is enough
        log.info("tool calling unavailable (%s); answering from retrieved context", e)

    # hide a leading <think>...</think> block if the model emits its reasoning inline
    started, pending = False, ""
    async for chunk in model.astream(messages):
        text = chunk.content if isinstance(chunk.content, str) else ""
        if not text:
            continue
        if started:
            yield {"type": "token", "content": text}
            continue
        pending += text
        head = pending.lstrip()
        if head.startswith("<think>"):
            if "</think>" not in head:
                continue
            text = head.split("</think>", 1)[1].lstrip()
        elif "<think>".startswith(head):
            continue
        else:
            text = pending
        started, pending = True, ""
        if text:
            yield {"type": "token", "content": text}
    if not started and pending:
        yield {"type": "token", "content": THINK.sub("", pending).strip()}
    yield {"type": "sources", "sources": _sources(used)}


async def summarize(transcript: str) -> str:
    """Short recruiter-style summary of a visitor's chat, for the email to Mahidhara."""
    prompt = (
        "Summarise this conversation between a website visitor and Mahidhara's portfolio assistant "
        "for Mahidhara. 4-6 bullets: who the visitor seems to be (only if stated), what they wanted "
        "to know, any role/company/contact details they gave, how interested they seemed, and a "
        "suggested follow-up. Plain text.\n\n" + transcript[:12000]
    )
    try:
        r = await llm().ainvoke([HumanMessage(prompt)])
        return THINK.sub("", str(r.content)).strip()
    except Exception as e:
        log.warning("summary failed: %s", e)
        return "(Automatic summary unavailable; full transcript below.)"
