"""Retrieval-augmented answering with LangChain.

Retriever: Supabase pgvector when configured, otherwise an in-memory index built from
knowledge/*.md at startup. Generator: any OpenAI-compatible endpoint (Hugging Face
Inference Providers by default, Ollama for fully local runs). LangSmith traces every
run automatically when LANGSMITH_TRACING=true.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import AsyncIterator

from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.vectorstores import InMemoryVectorStore, VectorStore
from langchain_openai import ChatOpenAI

from . import config
from .knowledge import load_documents

log = logging.getLogger("ask-mahi")

SYSTEM = """You are "Mahi AI", the portfolio assistant for Mahidhara S. (Mahi), an ML engineer \
moving from data analytics and machine learning into data science, based in Bangalore.

Rules:
- Answer ONLY from the context below. If the context does not contain the answer, say you \
don't have that detail and suggest emailing mahidhara.s@outlook.com. Never invent employers, \
numbers, dates, tools or credentials.
- Speak about Mahidhara in the third person, warmly and concretely, like a sharp colleague \
briefing a recruiter. Lead with the business outcome, then how it was done.
- Keep answers under 170 words unless asked for detail. Use short paragraphs or a few bullets.
- Model internals at his employer are confidential: describe outcomes, not proprietary details.
- Politely decline requests unrelated to Mahidhara's work, hiring or skills.

Context:
{context}"""


@lru_cache
def embeddings() -> FastEmbedEmbeddings:
    return FastEmbedEmbeddings(model_name=config.EMBED_MODEL)


@lru_cache
def supabase_client():
    if not (config.SUPABASE_URL and config.SUPABASE_KEY):
        return None
    from supabase import create_client

    return create_client(config.SUPABASE_URL, config.SUPABASE_KEY)


@lru_cache
def vector_store() -> VectorStore:
    client = supabase_client()
    if client is not None:
        from langchain_community.vectorstores import SupabaseVectorStore

        log.info("Using Supabase pgvector table %s", config.SUPABASE_TABLE)
        return SupabaseVectorStore(
            client=client,
            embedding=embeddings(),
            table_name=config.SUPABASE_TABLE,
            query_name=config.SUPABASE_QUERY_FN,
        )
    docs = load_documents(config.KNOWLEDGE_DIR)
    log.info("Supabase not configured; in-memory index with %d chunks", len(docs))
    store = InMemoryVectorStore(embeddings())
    store.add_documents(docs)
    return store


@lru_cache
def llm() -> ChatOpenAI:
    return ChatOpenAI(
        base_url=config.LLM_BASE_URL,
        api_key=config.LLM_API_KEY or "not-needed",
        model=config.LLM_MODEL,
        temperature=config.LLM_TEMPERATURE,
        max_tokens=500,
        streaming=True,
        timeout=60,
    )


def retrieve(question: str, history: list[dict]) -> list[Document]:
    # fold the last user turn in so follow-ups like "how?" still retrieve the right chunk
    prior = next((h["content"] for h in reversed(history) if h.get("role") == "user"), "")
    query = f"{prior}\n{question}" if prior and len(question) < 60 else question
    return vector_store().similarity_search(query, k=config.TOP_K)


def sources_of(docs: list[Document]) -> list[dict]:
    seen, out = set(), []
    for d in docs:
        title = d.metadata.get("title") or d.metadata.get("source", "Knowledge base")
        if title in seen:
            continue
        seen.add(title)
        out.append({"title": title, "url": d.metadata.get("url") or None})
    return out[:4]


def build_messages(question: str, history: list[dict], docs: list[Document]):
    context = "\n\n---\n\n".join(f"[{d.metadata.get('title', '')}]\n{d.page_content}" for d in docs)
    messages = [SystemMessage(SYSTEM.format(context=context or "(no matching context)"))]
    for h in history[-8:]:
        content = str(h.get("content", ""))[:2000]
        messages.append(HumanMessage(content) if h.get("role") == "user" else AIMessage(content))
    messages.append(HumanMessage(question))
    return messages


async def answer_stream(question: str, history: list[dict]) -> AsyncIterator[dict]:
    docs = retrieve(question, history)
    async for chunk in llm().astream(build_messages(question, history, docs)):
        if chunk.content:
            yield {"type": "token", "content": chunk.content}
    yield {"type": "sources", "sources": sources_of(docs)}
