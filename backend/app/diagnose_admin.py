"""Operator diagnostic. Never reset passwords or print credentials.

python -m app.diagnose_admin EMAIL [--online]
The database URL is prompted explicitly, avoiding stale .env/shell bindings.
--online makes one login attempt per fixed project origin and logs out on success.
"""
import argparse
import re
from getpass import getpass

import httpx
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.db import make_engine
from app.infrastructure.crypto import PasswordAdapter
from app.infrastructure.models import User

ORIGINS = (
    "https://nexora-api-s2q3.onrender.com",
    "https://nexora-digital-shop.vercel.app",
)


def response_code(response):
    try:
        code = response.json().get("code", "")
    except (ValueError, AttributeError):
        return "NON_JSON_RESPONSE"
    return code if isinstance(code, str) and re.fullmatch(r"[A-Z_]{1,64}", code) else "NO_CODE"


def online_check(client, email, password):
    csrf = client.get("/api/csrf")
    if csrf.status_code != 200:
        return f"CSRF_HTTP_{csrf.status_code}"
    try:
        token = csrf.json().get("token")
    except (ValueError, AttributeError):
        return "CSRF_NOT_JSON"
    if not isinstance(token, str) or not re.fullmatch(r"[a-f0-9]{64}", token):
        return "CSRF_INVALID_RESPONSE"
    result = client.post("/api/auth/login", json={"email": email, "password": password},
                         headers={"X-CSRF-TOKEN": token})
    if result.status_code != 200:
        return f"LOGIN_HTTP_{result.status_code} {response_code(result)}"
    try:
        manager = client.get("/api/admin/me")
        status = f"LOGIN_OK ADMIN_HTTP_{manager.status_code}"
    finally:
        # Login rotates the session, so obtain a new session-bound CSRF token.
        try:
            fresh = client.get("/api/csrf")
            token = fresh.json().get("token") if fresh.status_code == 200 else None
            logout = client.post("/api/auth/logout", headers={"X-CSRF-TOKEN": token}) if token else None
            cleaned = logout is not None and logout.status_code == 204
        except Exception:
            cleaned = False
    return status + (" LOGOUT_OK" if cleaned else " LOGOUT_NOT_CONFIRMED")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email")
    parser.add_argument("--online", action="store_true")
    args = parser.parse_args()
    email = args.email.strip().lower()
    database_url = getpass("Paste Render MIGRATION_DATABASE_URL (hidden): ").strip()
    password = getpass("Admin password to verify (hidden): ")
    engine = None
    try:
        url = make_url(database_url)
        if url.get_backend_name() not in {"postgresql", "postgres"}:
            raise ValueError("Expected PostgreSQL")
        if args.online and url.host in {None, "localhost", "127.0.0.1", "::1"}:
            print("REFUSED_LOCAL_DATABASE: use the actual Render migration URL.")
            return 1
        print("DATABASE_HOST:", url.host)
        print("DATABASE_NAME:", url.database)
        url = url.set(drivername="postgresql+psycopg").update_query_dict({"connect_timeout": "15"})
        engine = make_engine(url.render_as_string(hide_password=False))
        with Session(engine) as db:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                print("DATABASE_ACCOUNT_NOT_FOUND")
                return 1
            if not PasswordAdapter().verify(password, user.password_hash):
                print("DATABASE_PASSWORD_MISMATCH: no passwords changed.")
                return 1
        print("DATABASE_PASSWORD_OK")
    except Exception as error:
        print(f"DATABASE_CHECK_FAILED ({type(error).__name__}); details withheld to protect credentials.")
        return 1
    finally:
        if engine:
            engine.dispose()
    if args.online:
        for origin in ORIGINS:
            try:
                with httpx.Client(base_url=origin, timeout=45, follow_redirects=False) as client:
                    print(origin, online_check(client, email, password))
            except Exception as error:
                print(origin, f"NETWORK_OR_PROTOCOL_ERROR ({type(error).__name__})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
