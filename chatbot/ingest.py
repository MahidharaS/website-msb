"""Embed knowledge/*.md and upsert into Supabase pgvector.

    python ingest.py            # replace all rows in the documents table
    python ingest.py --dry-run  # just show the chunks
Run again whenever you edit the knowledge files.
"""
import sys

from app import config
from app.knowledge import load_documents
from app.rag import embeddings, supabase_client


def main() -> None:
    docs = load_documents(config.KNOWLEDGE_DIR)
    print(f"{len(docs)} chunks from {config.KNOWLEDGE_DIR}")
    if "--dry-run" in sys.argv:
        for d in docs:
            print(f"- [{d.metadata['source']} :: {d.metadata['title']}] {d.page_content[:90]!r}")
        return
    client = supabase_client()
    if client is None:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in chatbot/.env first.")
    vectors = embeddings().embed_documents([d.page_content for d in docs])
    client.table(config.SUPABASE_TABLE).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    rows = [
        {"content": d.page_content, "metadata": d.metadata, "embedding": v}
        for d, v in zip(docs, vectors)
    ]
    for i in range(0, len(rows), 50):
        client.table(config.SUPABASE_TABLE).insert(rows[i : i + 50]).execute()
    print(f"Upserted {len(rows)} rows into {config.SUPABASE_TABLE}.")


if __name__ == "__main__":
    main()
