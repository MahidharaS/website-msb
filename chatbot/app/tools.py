"""The four portfolio tools. Shared by the MCP server (for ChatGPT, Claude or any MCP client)
and by the website chatbot's own tool-calling loop, so both always see the same knowledge."""

import json

from .knowledge import store


def _pack(entries) -> str:
    return json.dumps([e.public() for e in entries], ensure_ascii=False)


async def search_portfolio(query: str, limit: int = 6) -> str:
    """Search everything known about Mahidhara (experience, projects, skills, achievements,
    story, FAQs). Use this first for any question."""
    await store.refresh()
    return _pack(store.search(query, k=max(1, min(limit, 10))))


async def get_project_details(name: str) -> str:
    """Get the full details of a project or case study by (part of) its name, e.g. 'lead scoring'."""
    await store.refresh()
    hits = store.search(name, k=3, type_="project")
    return _pack(hits)


async def get_experience() -> str:
    """List Mahidhara's roles and education in order: organisation, period, what he did, results."""
    await store.refresh()
    return _pack(store.by_type("experience", "education", "profile"))


async def get_skills() -> str:
    """List Mahidhara's skills and tools grouped by area (analytics, ML, LLM/AI, business)."""
    await store.refresh()
    return _pack(store.by_type("skill"))


TOOLS = [search_portfolio, get_project_details, get_experience, get_skills]
