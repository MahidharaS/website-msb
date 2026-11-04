import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


# ---------- LLM: any OpenAI-compatible endpoint (NVIDIA by default) ----------
LLM_BASE_URL = env("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
LLM_API_KEY = env("LLM_API_KEY") or env("NVIDIA_API_KEY")
LLM_MODEL = env("LLM_MODEL", "nvidia/nemotron-3.5-lightning-30b-a3b")
LLM_TEMPERATURE = float(env("LLM_TEMPERATURE", "0.3"))
LLM_MAX_TOKENS = int(env("LLM_MAX_TOKENS", "700"))
_default_extra = (
    # Nemotron "thinking" is great for agents but visitors should only see the answer
    '{"chat_template_kwargs": {"enable_thinking": false}}' if "nvidia" in LLM_BASE_URL else "{}"
)
LLM_EXTRA_BODY = json.loads(env("LLM_EXTRA_BODY", _default_extra) or "{}")

# ---------- Knowledge: a Google Drive folder shared "Anyone with the link: Viewer" ----------
DRIVE_FOLDER_URL = env("DRIVE_FOLDER_URL")
KNOWLEDGE_DIR = Path(env("KNOWLEDGE_DIR", str(ROOT / "knowledge")))
KNOWLEDGE_REFRESH_MINUTES = int(env("KNOWLEDGE_REFRESH_MINUTES", "30"))

# ---------- Email ----------
NOTIFY_EMAIL = env("NOTIFY_EMAIL", "mahidhara.s@outlook.com")
RESEND_API_KEY = env("RESEND_API_KEY")
MAIL_FROM = env("MAIL_FROM", "Portfolio <onboarding@resend.dev>")
SMTP_HOST = env("SMTP_HOST")
SMTP_PORT = int(env("SMTP_PORT", "587"))
SMTP_USER = env("SMTP_USER")
SMTP_PASS = env("SMTP_PASS")
CHAT_IDLE_MINUTES = float(env("CHAT_IDLE_MINUTES", "10"))

# ---------- Web / admin ----------
ALLOWED_ORIGINS = [o.strip() for o in env("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
RATE_LIMIT = int(env("RATE_LIMIT_PER_MINUTE", "20"))
ADMIN_TOKEN = env("ADMIN_TOKEN")
TOP_K = int(env("TOP_K", "6"))
