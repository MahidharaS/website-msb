# Knowledge format (Google Drive folder)

Upload the files in `knowledge/` to your Drive folder to start. The server reads `.json`,
`.txt`, `.md`, Google Docs and Sheets from it every 30 minutes, or right away from
`/admin` → Sync now. Subfolders are read too.

Each `.json` file holds `{"entries": [ ... ]}`. One entry:

| field | required | example |
|---|---|---|
| `type` | yes | `profile`, `experience`, `education`, `project`, `skill`, `achievement`, `story`, `faq`, `voice` (how you talk; shapes the tone of every answer) |
| `title` | yes | `"Lead engine"` |
| `summary` | yes | one or two sentences |
| `details` | no | longer text |
| `org`, `period` | no | `"Digital Maven"`, `"2024–present"` |
| `metrics` | no | `["94.6% accuracy"]` |
| `tags` | no | `["NLP", "sales"]` |
| `url` | no | `"/work/lead-engine"` (shown as a source) |
| `public` | no | `false` hides the entry |

Only write what you are happy for anyone to read: the folder is shared by link.
This is also the format to give your ChatGPT scheduled task, so its output drops straight in.

## Updating
- Add or edit files in the knowledge folder; subfolders (e.g. `Resume 2027/`) are read too.
- PDFs are skipped: open a resume PDF in Google Docs and keep that copy in the folder.
- Changes are picked up within 30 minutes, or instantly via /api/admin → Sync now.
- The chat-history folder is never read as knowledge.
