# Integration validation — 2026-11-02

- Full backend suite against PostgreSQL isolated schemas and Redis test DB: **225 passed**.
- Bot suite: **41 passed**. Includes actual aiogram dispatcher update parsing with simulated Telegram transport.
- Existing JavaScript test files: **7 passed**.
- Frontend production build and TypeScript check: passed.
- Backend Ruff check: passed.
- `scripts/check-telegram.mjs`: passed in Chromium at 320/1440px; link creation, status refresh, unlink, CSRF headers, failure/retry; API mocked.
- Real HTTP bot preflight against updated local API: passed; **114 products** and matching product detail.
- Migration `0009` and runtime grants applied successfully to the local development database.
- Real bot API client → FastAPI contract test: passed for products, search, detail, authenticated confirmation and replay rejection.
- Security coverage: session requirement, CSRF, missing/wrong service credential, invalid Telegram IDs, expiry, replacement, replay, account conflict/isolation, unlink, concurrent single-use consumption.

One backend dependency deprecation warning (Starlette/httpx) remains; no failed/skipped backend tests in this run.

**Not verified:** live Telegram getMe/polling/message delivery, external deployment, email/AI integrations.
No usable BotFather token or public bot username was available. No real Telegram messages were sent.
Mini App conversion and visual redesign are deferred until user acceptance of the chat bot.
