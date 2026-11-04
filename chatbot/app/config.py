import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


LLM_BASE_URL = env("LLM_BASE_URL", "https://router.huggingface.co/v1")
LLM_API_KEY = env("LLM_API_KEY") or env("HF_TOKEN")
LLM_MODEL = env("LLM_MODEL", "Qwen/Qwen2.5-7B-Instruct")
LLM_TEMPERATURE = float(env("LLM_TEMPERATURE", "0.2"))

EMBED_MODEL = env("EMBED_MODEL", "BAAI/bge-small-en-v1.5")
KNOWLEDGE_DIR = Path(env("KNOWLEDGE_DIR", str(ROOT / "knowledge")))

SUPABASE_URL = env("SUPABASE_URL")
SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_TABLE = env("SUPABASE_TABLE", "documents")
SUPABASE_QUERY_FN = env("SUPABASE_QUERY_FN", "match_documents")
LOG_CHATS = env("LOG_CHATS", "true").lower() == "true"

ALLOWED_ORIGINS = [o.strip() for o in env("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
RATE_LIMIT = int(env("RATE_LIMIT_PER_MINUTE", "20"))
TOP_K = int(env("TOP_K", "5"))
