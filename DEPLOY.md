# Deploying the portfolio + Ask Mahi

```
Browser ──▶ Render (website, Node SSR) ──SSE──▶ Hugging Face Space (FastAPI + LangChain)
                                                   ├─▶ HF Inference Providers (open-weight LLM)
                                                   ├─▶ Supabase (pgvector knowledge + chat log)
                                                   └─▶ LangSmith (traces, evals)
```

## 1. Supabase (database)
1. Create a project at supabase.com (free tier).
2. SQL Editor → paste `chatbot/supabase/schema.sql` → Run.
3. Settings → API: copy the **Project URL** and the **service_role** key (backend only).

## 2. Load the knowledge base
Edit or add files in `chatbot/knowledge/` (resume text, GitHub project write-ups…), then:

```bash
cd chatbot && cp .env.example .env    # fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
docker compose run --rm api python ingest.py
# (or, with a Python venv: pip install -r requirements.txt && python ingest.py)
```

Re-run `python ingest.py` whenever the knowledge files change.

## 3. Hugging Face Space (backend + model)
1. huggingface.co → New Space → SDK **Docker** → Blank → hardware **CPU basic (free)**.
2. Push the *contents* of `chatbot/` to the Space repo (its `README.md` already has the Space header):

   ```bash
   git clone https://huggingface.co/spaces/<you>/ask-mahi hf-space
   cp -r chatbot/. hf-space/ && cd hf-space && git add . && git commit -m "Ask Mahi" && git push
   ```

3. Space → Settings → **Variables and secrets** (secrets marked 🔒):
   - 🔒 `LLM_API_KEY` = HF access token (fine-grained, "Make calls to Inference Providers")
   - `LLM_MODEL` = `Qwen/Qwen2.5-7B-Instruct` (or any open-weight chat model offered by Inference Providers)
   - 🔒 `SUPABASE_URL`, 🔒 `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS` = `https://<your-render-site>.onrender.com,https://lime-and-heart-showcase.lovable.app`
   - Optional: `LANGSMITH_TRACING=true`, 🔒 `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT=ask-mahi`
4. The API is then at `https://<you>-ask-mahi.hf.space` (check `/health`).

Free Spaces sleep after inactivity; the site shows "waking the model" and falls back to
offline answers until it is up.

## 4. Render (website)
1. render.com → New → Blueprint → pick this repo (uses `render.yaml`, which builds the
   root `Dockerfile` with Bun — no npm involved).
2. Set `VITE_CHAT_API_URL=https://<you>-ask-mahi.hf.space` (and `VITE_RESUME_URL` if you
   host the resume yourself). These are baked in at build time, so redeploy after changing them.

## 5. Lovable
Lovable keeps hosting its own copy. To make its chat live too, add `VITE_CHAT_API_URL`
in Lovable's project settings (environment) — no code change needed.
