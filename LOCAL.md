# Run everything on localhost

Nothing here changes the hosted site: local settings live in `.env.local` and
`chatbot/.env`, both git-ignored. Lovable and Render keep using their own settings.

## 1. Website (Node 20+)

```bash
git clone https://github.com/mahidharas/website-msb.git
cd website-msb
npm install
cp .env.example .env.local      # VITE_CHAT_API_URL=http://localhost:7860
npm run dev:local               # http://127.0.0.1:5173
```

Production-like run (same build Render uses):

```bash
npm run build:node && PORT=3000 npm run start:node   # http://localhost:3000
```

If `VITE_CHAT_API_URL` is empty or the backend is off, Ask Mahi switches to
**offline mode** and answers from `src/data/content.ts` (it says so on screen).

## 2. Ask Mahi backend (Python 3.11+)

```bash
cd chatbot
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # put your HF token in LLM_API_KEY
uvicorn app.main:app --reload --port 7860
```

Check: `http://localhost:7860/health`. Without Supabase keys it builds an in-memory
index from `chatbot/knowledge/*.md` at startup, so it works offline from the database.

### Fully local model (no token)

Install [Ollama](https://ollama.com), then:

```bash
ollama pull qwen2.5:3b
```

and in `chatbot/.env`:

```
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:3b
```

### Or with Docker

```bash
cd chatbot && docker compose up --build
```

(With `--profile ollama`, set `LLM_BASE_URL=http://ollama:11434/v1` in `.env`.)

## 3. Resume locally

The resume and some images are stored in Lovable's asset host, which only resolves on
Lovable. For localhost/Render, drop `resume.pdf` into `public/` and set
`VITE_RESUME_URL=/resume.pdf` in `.env.local`.
