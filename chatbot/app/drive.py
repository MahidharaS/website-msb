"""Read a Google Drive folder that is shared as "Anyone with the link: Viewer".

No API key, no OAuth app: Drive's embedded folder view lists the files of a link-shared
folder, and each file downloads from its public URL. Native Google Docs/Sheets are exported
as text/CSV. Subfolders are followed one level deep at a time (max depth 3).

Only put content in that folder that you are happy for anyone to read.
"""
from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass

import httpx

log = logging.getLogger("ask-mahi.drive")

FOLDER_ID = re.compile(r"(?:folders/|[?&]id=)([A-Za-z0-9_-]{10,})")
ENTRY = re.compile(
    r'<div class="flip-entry" id="entry-([A-Za-z0-9_-]+)".*?<a href="([^"]+)".*?<div class="flip-entry-title">(.*?)</div>',
    re.S,
)
UA = {"User-Agent": "Mozilla/5.0 (portfolio-knowledge-sync)"}


@dataclass
class DriveFile:
    id: str
    name: str
    url: str
    text: str


def folder_id(url_or_id: str) -> str:
    m = FOLDER_ID.search(url_or_id)
    if m:
        return m.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", url_or_id.strip()):
        return url_or_id.strip()
    raise ValueError("That doesn't look like a Google Drive folder link.")


def _download_url(href: str, fid: str) -> str | None:
    if "/document/" in href:
        return f"https://docs.google.com/document/d/{fid}/export?format=txt"
    if "/spreadsheets/" in href:
        return f"https://docs.google.com/spreadsheets/d/{fid}/export?format=csv"
    if "/presentation/" in href:
        return f"https://docs.google.com/presentation/d/{fid}/export/txt"
    if "/folders/" in href:
        return None
    return f"https://drive.google.com/uc?export=download&id={fid}"


TEXT_EXT = (".json", ".txt", ".md", ".csv")


async def fetch_folder(url_or_id: str, depth: int = 0) -> list[DriveFile]:
    fid = folder_id(url_or_id)
    out: list[DriveFile] = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=UA) as client:
        r = await client.get(f"https://drive.google.com/embeddedfolderview?id={fid}#list")
        if r.status_code != 200:
            raise RuntimeError(
                f"Drive returned {r.status_code}. Is the folder shared as 'Anyone with the link'?"
            )
        entries = ENTRY.findall(r.text)
        for eid, href, raw_name in entries:
            name = html.unescape(re.sub(r"<[^>]+>", "", raw_name)).strip()
            if "/folders/" in href:
                if depth < 3:
                    out += await fetch_folder(eid, depth + 1)
                continue
            native = any(k in href for k in ("/document/", "/spreadsheets/", "/presentation/"))
            if not native and not name.lower().endswith(TEXT_EXT):
                continue  # images, PDFs etc. are skipped
            dl = _download_url(href, eid)
            if not dl:
                continue
            try:
                f = await client.get(dl)
                f.raise_for_status()
                out.append(DriveFile(id=eid, name=name, url=href, text=f.text))
            except Exception as e:  # one bad file must not break the sync
                log.warning("skip %s: %s", name, e)
    return out
