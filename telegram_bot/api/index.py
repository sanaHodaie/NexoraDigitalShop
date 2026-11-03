"""Vercel ASGI function. Root Directory must be telegram_bot."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from webhook_app import app  # noqa: E402,F401
