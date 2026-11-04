/**
 * Ask Mahi — chat history writer for YOUR Google Drive.
 *
 * Deploy once (5 minutes, no API key, no Cloud console):
 *  1. Create a Drive folder, e.g. "Portfolio – chat history" (keep it PRIVATE, do not share it).
 *     Open it and copy the id from the URL: drive.google.com/drive/folders/<THIS_PART>
 *  2. Go to script.google.com → New project → paste this whole file.
 *  3. Set FOLDER_ID and SECRET below (SECRET = any long random string, same as HISTORY_SECRET on the API).
 *  4. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 *     Authorise with your Google account. Copy the Web app URL (ends with /exec).
 *  5. On the API set HISTORY_WEBHOOK_URL=<that URL> and HISTORY_SECRET=<same secret>.
 *
 * The script runs as you, so only it can write to your folder; callers need the SECRET.
 * One JSON file per visitor (name+email), holding the summaries of their past chats.
 */
const FOLDER_ID = "PASTE_FOLDER_ID_HERE";
const SECRET = "PASTE_THE_SAME_LONG_SECRET_HERE";
const KEEP = 20; // conversations kept per visitor

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: "bad json" }); }
  if (body.secret !== SECRET) return out({ ok: false, error: "unauthorised" });
  const key = String(body.visitor_key || "").replace(/[^a-z0-9@._-]/gi, "_").slice(0, 120);
  if (!key) return out({ ok: false, error: "missing visitor_key" });
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const name = key + ".json";
  const files = folder.getFilesByName(name);
  const file = files.hasNext() ? files.next() : null;
  let record = { visitor_key: key, name: "", email: "", conversations: [] };
  if (file) { try { record = JSON.parse(file.getBlob().getDataAsString()); } catch (err) {} }

  if (body.action === "lookup") return out({ ok: true, record: file ? record : null });

  if (body.action === "save") {
    record.name = body.name || record.name;
    record.email = body.email || record.email;
    record.conversations.push({ date: body.date, summary: body.summary, transcript: body.transcript });
    record.conversations = record.conversations.slice(-KEEP);
    const text = JSON.stringify(record, null, 2);
    if (file) file.setContent(text); else folder.createFile(name, text, "application/json");
    return out({ ok: true });
  }
  return out({ ok: false, error: "unknown action" });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
