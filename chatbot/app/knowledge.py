"""Portfolio knowledge: load JSON (and text) entries, keep them fresh, search them.

Entry schema (one object, a list of objects, or {"entries": [...]} per .json file):

    {
      "type": "profile | experience | project | skill | achievement | education | faq | story",
      "title": "Lead engine",
      "summary": "One or two sentences.",
      "details": "Longer text (optional).",
      "org": "Digital Maven",          # optional
      "period": "2024–present",        # optional
      "metrics": ["94.6% accuracy"],   # optional
      "tags": ["NLP", "sales"],        # optional
      "url": "/work/lead-engine",      # optional link shown as a source
      "public": true                   # anything with public: false is ignored
    }

.txt / .md files become one "note" entry per heading section.
Source: the Drive folder in DRIVE_FOLDER_URL, else the local knowledge/ folder.
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from . import config
from .drive import fetch_folder

log = logging.getLogger("ask-mahi.knowledge")

STOP = set(
    "a an the and or of to in on for with is are was were be been at by it its as from that this what which who how "
    "do does did i you he his him me my your about can tell would could should will mahidhara mahi s".split()
)


def tokenize(s: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9₹%+.]+", s.lower()) if w not in STOP and len(w) > 1]


@dataclass
class Entry:
    type: str
    title: str
    summary: str
    details: str = ""
    org: str = ""
    period: str = ""
    metrics: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    url: str = ""
    source: str = ""

    def text(self) -> str:
        bits = [f"[{self.type}] {self.title}"]
        if self.org or self.period:
            bits.append(" · ".join(x for x in (self.org, self.period) if x))
        bits.append(self.summary)
        if self.details:
            bits.append(self.details)
        if self.metrics:
            bits.append("Metrics: " + "; ".join(self.metrics))
        if self.tags:
            bits.append("Tags: " + ", ".join(self.tags))
        return "\n".join(b for b in bits if b)

    def public(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v and k != "source"}


def _from_json(raw: str, source: str) -> list[Entry]:
    data = json.loads(raw)
    if isinstance(data, dict):
        data = data.get("entries", [data])
    out = []
    for d in data if isinstance(data, list) else []:
        if not isinstance(d, dict) or d.get("public") is False:
            continue
        out.append(
            Entry(
                type=str(d.get("type", "note")).lower(),
                title=str(d.get("title", "")).strip() or source,
                summary=str(d.get("summary", "")).strip(),
                details=str(d.get("details", "")).strip(),
                org=str(d.get("org", "")),
                period=str(d.get("period", "")),
                metrics=[str(x) for x in d.get("metrics", []) or []],
                tags=[str(x) for x in d.get("tags", []) or []],
                url=str(d.get("url", "")),
                source=source,
            )
        )
    return out


def _from_text(raw: str, source: str) -> list[Entry]:
    raw = re.sub(r"^---\n.*?\n---\n", "", raw, flags=re.S)
    parts = re.split(r"\n(?=#{1,3} )", "\n" + raw)
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        title, _, body = p.partition("\n")
        title = title.lstrip("# ").strip() or source
        body = body.strip()
        if body:
            out.append(Entry(type="note", title=title, summary=body[:600], details=body[600:], source=source))
    return out


def parse(name: str, raw: str) -> list[Entry]:
    try:
        if name.lower().endswith(".json"):
            return _from_json(raw, name)
        return _from_text(raw, name)
    except Exception as e:
        log.warning("could not parse %s: %s", name, e)
        return []


class KnowledgeStore:
    def __init__(self) -> None:
        self.entries: list[Entry] = []
        self.loaded_at = 0.0
        self.source = "none"
        self.folder_url = config.DRIVE_FOLDER_URL
        self.error = ""
        self._lock = asyncio.Lock()
        self._index: list[Counter] = []
        self._df: Counter = Counter()

    async def refresh(self, force: bool = False) -> None:
        if not force and time.time() - self.loaded_at < config.KNOWLEDGE_REFRESH_MINUTES * 60 and self.entries:
            return
        async with self._lock:
            entries: list[Entry] = []
            if self.folder_url:
                try:
                    for f in await fetch_folder(self.folder_url):
                        entries += parse(f.name, f.text)
                    self.source, self.error = "google-drive", ""
                except Exception as e:
                    self.error = str(e)
                    log.warning("drive sync failed, keeping previous knowledge: %s", e)
                    if self.entries:
                        self.loaded_at = time.time()
                        return
            if not entries:
                for p in sorted(Path(config.KNOWLEDGE_DIR).rglob("*")):
                    if p.suffix.lower() in (".json", ".md", ".txt"):
                        entries += parse(p.name, p.read_text(encoding="utf-8"))
                self.source = "local" if not self.folder_url else "local (drive unavailable)"
            self.entries = entries
            self._index = [Counter(tokenize(e.text())) for e in entries]
            self._df = Counter(w for c in self._index for w in c)
            self.loaded_at = time.time()
            log.info("knowledge: %d entries from %s", len(entries), self.source)

    def search(self, query: str, k: int = config.TOP_K, type_: str | None = None) -> list[Entry]:
        q = tokenize(query)
        n = max(1, len(self.entries))
        avg = sum(sum(c.values()) for c in self._index) / n if self._index else 1
        scored = []
        for e, c in zip(self.entries, self._index):
            if type_ and e.type != type_:
                continue
            length = sum(c.values()) or 1
            s = 0.0
            for w in q:
                f = c.get(w, 0)
                if not f:
                    continue
                idf = math.log(1 + (n - self._df[w] + 0.5) / (self._df[w] + 0.5))
                s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * length / avg))
            title = e.title.lower()
            s += 0.4 * sum(1 for w in q if w in title)
            scored.append((s, e))
        scored.sort(key=lambda x: -x[0])
        hits = [e for s, e in scored if s > 0][:k]
        if not hits and type_:
            hits = [e for _, e in scored][:k]
        return hits

    def by_type(self, *types: str) -> list[Entry]:
        return [e for e in self.entries if e.type in types]


store = KnowledgeStore()
