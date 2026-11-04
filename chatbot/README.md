# Ask Mahi — portfolio assistant API

FastAPI service behind the website's **Ask Mahi** page and contact form.

- **Model:** NVIDIA `nemotron-3.5-lightning-30b-a3b` through NVIDIA's OpenAI-compatible API
  (any OpenAI-compatible model works via `LLM_*` settings).
- **Knowledge:** JSON/text files in a Google Drive folder shared by link (no API key or OAuth),
  refreshed every 30 minutes; falls back to `knowledge/` locally. Format: `KNOWLEDGE_FORMAT.md`.
- **Tools / MCP:** `search_portfolio`, `get_project_details`, `get_experience`, `get_skills`.
  The chatbot calls them through Nemotron's tool calling, and the same tools are served read-only
  as an MCP server at `/mcp/` for ChatGPT, Claude or other agents.
- **Email:** contact-form messages and a summary + transcript of every chat go to `NOTIFY_EMAIL`
  (Resend or SMTP). Chats are emailed when the visitor leaves or after 10 idle minutes.
- **Visitor memory (optional):** chats are saved per visitor to a private Drive folder via a
  small Apps Script (`drive-history/Code.gs`); a returning visitor who gives their name/email is
  welcomed back using private notes that are never quoted back.
- **Owner page:** `/admin` to connect the Drive folder, sync, see what the assistant knows and
  send a test email.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | model, key present, knowledge source, email on |
| POST | `/chat/stream` | `{message, history[], session_id, meta}` → SSE tokens, sources, done |
| POST | `/chat/end` | `{session_id}` → email the chat now |
| POST | `/contact` | contact form → email |
| GET | `/admin` | owner page |
| * | `/mcp/` | MCP (streamable HTTP) |

Run locally: `../LOCAL.md`. Deploy: `../DEPLOY.md`.
