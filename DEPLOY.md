# Deploying the portfolio + Ask Mahi

```
Visitor ─▶ Website (Render / Lovable) ─▶ Ask Mahi API (Render)
                                           ├─ NVIDIA Nemotron (answers, tool calling)
                                           ├─ read-only MCP tools over your Google Drive folder
                                           └─ email to you (contact form + chat summaries)
ChatGPT scheduled task ─▶ writes curated JSON into the same Drive folder every 2 days
```

## 1. NVIDIA key (the model)
build.nvidia.com → open `nvidia/nemotron-3.5-lightning-30b-a3b` → **Generate API Key**. It starts with `nvapi-`.

## 2. Google Drive folder (the knowledge)
1. Create a folder, e.g. `Portfolio – public knowledge`. Put only things anyone may read in it.
2. Upload the JSON files from `chatbot/knowledge/` as a starting point (format: `chatbot/KNOWLEDGE_FORMAT.md`).
3. Right-click the folder → **Share** → General access: **Anyone with the link → Viewer** → **Copy link**.

No Google API key or OAuth app is needed: the server reads the link-shared folder directly.

## 3. Email (so messages and chat summaries reach you)
Easiest: **Resend** (free, 100 emails/day).
1. Sign up at resend.com **using mahidhara.s@outlook.com** (without your own domain, Resend can only
   send to the address you signed up with, which is exactly what we need).
2. API Keys → Create → copy the `re_…` key.

(Alternative: SMTP with a Gmail account + App Password, see `chatbot/.env.example`.)

## 4. Render
1. render.com → **New → Blueprint** → connect `MahidharaS/website-msb`. It reads `render.yaml` and
   creates two services: `ask-mahi-api` and `mahidhara-portfolio`.
2. Fill the values it asks for:
   - `ask-mahi-api`: `LLM_API_KEY` = your `nvapi-…`, `DRIVE_FOLDER_URL` = folder link,
     `RESEND_API_KEY` = `re_…`, `ALLOWED_ORIGINS` = your website URLs (comma separated).
   - `mahidhara-portfolio`: `VITE_CHAT_API_URL` = the API URL Render shows, e.g. `https://ask-mahi-api.onrender.com`.
3. Deploy. Check `https://<api>/health` → `"llm_key": true`, `"knowledge": {"source": "google-drive"}`, `"email": true`.
4. Open `https://<api>/admin`, sign in with `ADMIN_TOKEN` (Render → ask-mahi-api → Environment
   shows the generated value) → **Send test email**.

Free Render services sleep after ~15 minutes without traffic; the first chat after that takes ~30–60 s
while it wakes (the site shows "waking the model" and answers offline meanwhile). A paid instance
($7/month) removes the wait.

## 5. Lovable (optional)
To make the Lovable-hosted copy use the same AI, add `VITE_CHAT_API_URL` in Lovable's project
environment settings and add the Lovable URL to `ALLOWED_ORIGINS` on the API.

## 6. ChatGPT curator (every 2 days)
Create a scheduled task in ChatGPT with the Google Drive connector, and give it the format from
`chatbot/KNOWLEDGE_FORMAT.md`, for example:

> Every 2 days: review what you know about my work from my projects and notes. Keep only facts that
> are safe for the public and make my portfolio stronger (no salaries, client names under NDA,
> personal details). Write them as JSON entries in the documented format and update the files in my
> Drive folder "Portfolio – public knowledge". Keep existing entries unless they are outdated.

The API picks up changes within 30 minutes, or immediately via `/admin` → Sync now.

## Using the MCP server elsewhere
The API also serves a read-only MCP server at `https://<api>/mcp/` with the tools
`search_portfolio`, `get_project_details`, `get_experience`, `get_skills`, so you can plug your
portfolio knowledge into ChatGPT, Claude or other agents too.
