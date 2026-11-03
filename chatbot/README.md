---
title: Ask Mahi
emoji: 🟢
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Ask Mahi — portfolio RAG assistant

FastAPI + LangChain retrieval-augmented assistant for Mahidhara's portfolio.

- **Retriever:** Supabase pgvector (`supabase/schema.sql`) or, if not configured, an
  in-memory index built from `knowledge/*.md` at startup.
- **Embeddings:** `BAAI/bge-small-en-v1.5` via FastEmbed (ONNX, CPU, free).
- **LLM:** any OpenAI-compatible endpoint — Hugging Face Inference Providers by default
  (`Qwen/Qwen2.5-7B-Instruct`), or Ollama for fully local runs.
- **Observability:** LangSmith tracing when `LANGSMITH_TRACING=true`.
- **Logging:** each turn is stored in Supabase `chat_messages` (service-role only, RLS on).

## API
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | – | `{ok, model, store}` |
| POST | `/chat/stream` | `{message, history[], session_id}` | SSE: `{"type":"token"}` … `{"type":"sources"}` `{"type":"done"}` |
| POST | `/chat` | same | `{answer, sources}` |

Configure with the variables in `.env.example`. Deploy steps: see `../DEPLOY.md`.
Local run: see `../LOCAL.md`.

## Swapping the framework
`app/rag.py` is the only place that knows about LangChain. To use CrewAI agents or a Dify
app instead, replace `answer_stream()` with a generator that yields the same events — the
website does not need to change.
