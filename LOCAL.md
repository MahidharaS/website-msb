# Run everything on localhost (no npm needed)

Nothing here changes the hosted site: local settings live in `.env.local` and
`chatbot/.env`, both git-ignored. Lovable keeps using its own build.

Pick **one** of the two options.

---

## Option A — Docker (nothing installed on the Mac except Docker)

Every package is installed *inside* throw-away containers, never on your Mac.
Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) or
[OrbStack](https://orbstack.dev) (lighter, Mac only).

```bash
git clone https://github.com/MahidharaS/website-msb.git
cd website-msb
cp chatbot/.env.example chatbot/.env      # open it and paste your HF token into LLM_API_KEY
docker compose up --build
```

- Website: http://localhost:3000
- Chat API: http://localhost:7860/health

Stop with `Ctrl+C`; remove everything with `docker compose down --rmi all`.

---

## Option B — Bun (one small binary, no Node, no npm)

[Bun](https://bun.sh) replaces Node + npm. It is what Lovable already uses for this
project (`bun.lock`), and two safety settings are on:

- install scripts of dependencies **do not run** (the way most npm attacks spread) —
  Bun only runs them for packages listed in `trustedDependencies`, and there are none;
- `bunfig.toml` refuses any package version published less than 24 hours ago, and
  `--frozen-lockfile` installs exactly the versions in `bun.lock`.

```bash
brew install oven-sh/bun/bun              # or: curl -fsSL https://bun.sh/install | bash
git clone https://github.com/MahidharaS/website-msb.git
cd website-msb
bun install --frozen-lockfile
cp .env.example .env.local                # VITE_CHAT_API_URL=http://localhost:7860
bun run local:dev                         # http://127.0.0.1:5173
```

Production-like run:

```bash
bun run local:build && PORT=3000 bun run local:start      # http://localhost:3000
```

### Chat backend (Python, already on macOS)

```bash
cd chatbot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # paste your nvapi-… key into LLM_API_KEY
uvicorn app.main:app --reload --port 7860
```

Then put `VITE_CHAT_API_URL=http://localhost:7860` in the website's `.env.local` and restart
`bun run local:dev`. Owner page: http://localhost:7860/admin (uses `ADMIN_TOKEN` from `.env`).
Without a mail provider in `.env`, emails are printed in the backend terminal instead of sent.

---

## Without the backend

If `VITE_CHAT_API_URL` is empty or the backend is off, Ask Mahi switches to
**offline mode** and answers from `src/data/content.ts` (it says so on screen).

## Other models

Any OpenAI-compatible endpoint works by changing `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL`
in `chatbot/.env` (NVIDIA is the default; Hugging Face or a local Ollama also work).

## Resume locally

The resume is stored on Lovable's asset host, which only resolves on Lovable. For
localhost/Render, drop `resume.pdf` into `public/` and set `VITE_RESUME_URL=/resume.pdf`
in `.env.local` (Option B) or as a build arg in `docker-compose.yml` (Option A).
