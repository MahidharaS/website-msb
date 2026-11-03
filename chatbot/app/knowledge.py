"""Load the markdown knowledge base into LangChain documents with title/url metadata."""
import re
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

FRONT = re.compile(r"^---\n(.*?)\n---\n", re.S)


def _front_matter(text: str) -> tuple[dict, str]:
    m = FRONT.match(text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, text[m.end():]


def load_documents(folder: Path) -> list[Document]:
    headers = MarkdownHeaderTextSplitter([("#", "h1"), ("##", "h2")], strip_headers=False)
    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
    docs: list[Document] = []
    for path in sorted(folder.glob("*.md")):
        meta, body = _front_matter(path.read_text(encoding="utf-8"))
        for section in headers.split_text(body):
            title = section.metadata.get("h2") or section.metadata.get("h1") or meta.get("title", path.stem)
            for chunk in splitter.split_text(section.page_content):
                docs.append(
                    Document(
                        page_content=chunk,
                        metadata={"source": path.name, "title": title, "url": meta.get("url", "")},
                    )
                )
    return docs
