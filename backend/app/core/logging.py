import json
import logging
import re
from datetime import datetime, timezone


def redact(value):
    text = str(value)
    text = re.sub(r"(?i)Bearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]", text)
    text = re.sub(r"(?i)(postgres(?:ql)?(?:\+psycopg)?|rediss?)://[^\s]+", r"\1://[REDACTED]", text)
    text = re.sub(
        r"""(?i)(["']?(?:[\w-]*(?:password|secret|token|credential)|authorization|cookie|api[_-]?key)["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)""",
        r"\1[REDACTED]",
        text,
    )
    return text


class SafeFormatter(logging.Formatter):
    def format(self, record):
        # Exceptions often carry SQL parameters/HTTP bodies; omit them entirely.
        return json.dumps(
            {
                "time": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": redact(record.getMessage()),
            }
        )


def configure_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(SafeFormatter())
    logging.getLogger().handlers = [handler]
    logging.getLogger().setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").disabled = True  # Never log URL tokens/query strings.
