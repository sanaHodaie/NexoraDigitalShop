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

## Bottom-menu category navigation — 2026-11-03

- Updated bot suite: **48 passed**; modified Python files pass Ruff checks.
- Main/category/product/language menus use persistent, resized Telegram reply keyboards.
- Catalogue categories and counts are derived from API products; category selection forwards the category filter.
- Verified the seeded catalogue categories, page controls, duplicate product names, full details/specifications, Unicode message limits, and failed-image text fallback.
- Real aiogram dispatcher with simulated Telegram transport verifies start → category → product details, search cancellation by menu buttons, and language changes.
- Comparison selections survive category navigation; maximum three products, same-category validation, and clear-selection paths tested.
- No live Telegram calls were made for this UI update. User should restart the local bot, send /start, and perform the updated manual checklist.
- Backend/frontend code unchanged in this update; prior backend/browser evidence above belongs to the original integration validation.

## Welcome Start button and category artwork — 2026-11-03

- Bot suite: **52 passed**; Ruff checks pass for modified Python files.
- /start sends a welcome message with an inline Start button below it. The Start callback opens the persistent category menu.
- Category menu uses two columns, including safe handling of an odd category count.
- Selecting a category uploads its existing website category PNG from a whitelisted local path before listing products; missing/upload-failed artwork does not block browsing.
- Category artwork upload and unknown-category path safety are covered by tests; real dispatcher simulation covers the Start callback.
- Generated profile avatar saved at assets/nexora-bot-avatar.png. It has not been uploaded to Telegram; owner can use BotFather /setuserpic.
- No live Telegram call or deployment was performed for this update. Closing the foreground terminal still stops the bot.

## Webhook hosting and response-speed preparation — 2026-11-03

- Bot/webhook suite: **66 passed**, including tests against a dedicated local PostgreSQL instance; no skipped tests in this run.
- Verified state, language, comparison, menu and search continuation across a NEW runtime/dispatcher/client for every update.
- PostgreSQL tests cover successful-update deduplication, rollback/retry, simultaneous same-user updates and persistent media IDs shared across users.
- Short-lived catalogue caching reduces duplicate list calls; search/details stay fresh; failed responses are not cached.
- Product menu is sent before category artwork. Existing Telegram file IDs avoid repeated uploads; packaged deployments fall back to the public frontend artwork URL.
- Webhook tests cover secret authentication, fail-closed missing configuration, malformed/oversized payloads, awaited processing and retryable failures without error disclosure.
- Expired callback acknowledgements do not permanently block the delivery queue; other Telegram errors propagate for retry.
- Management command tests verify endpoint preflight sends only invalid empty updates and registration preserves queued updates and uses the secret header.
- Exact database setup command executed successfully; a restricted test runtime role can access bot state/media and is denied access to a shop-private test table.
- Production dependency export installed in a separate environment. The packaged api/index.py ASGI entry point started successfully; real local HTTP verified health=200, unauthenticated webhook=401, authenticated malformed update=400. Public-image fallback verified without local artwork files.
- Ruff and git diff checks passed. No backend/frontend application code changed.

Not executed: deployment to a real Vercel/Render account, provisioning the user's Neon database, live Telegram webhook registration, or external end-to-end latency measurement. No live Telegram messages were sent. Free-tier eligibility and production behavior must be confirmed on the chosen host; Vercel Hobby should not be assumed suitable for commercial use.

## Customer care, wholesale inbox and illustrated error pages — 2026-11-04

- Bot suite: **69 passed** with dedicated PostgreSQL-backed webhook tests, including a wholesale form completed across fresh runtimes for every field.
- Full backend regression run: **226 passed, 1 skipped** (optional Redis service test), one existing Starlette/httpx deprecation warning.
- Follow-up customer-request security/real-client contract run: **4 passed**, including bot intake → authenticated admin API with correct customer, quantity and address.
- Verified service-key authentication, replay-safe request IDs, validation, per-Telegram-user tracking, admin read/write capabilities, CSRF, private staff-note exclusion and optimistic version checks.
- Production frontend/admin build, TypeScript and **48 JavaScript tests** passed; backend/new bot Python checks passed.
- Chromium checks passed for unknown route/category/article pages, loaded generated artwork, noindex, light/dark 320–1440px layouts, admin customer/address rendering and authenticated status-edit CSRF headers (browser API mocked).
- Browser also injected a real page-render failure, verified the illustrated unavailable fallback, then verified recovery through Retry after removing the injected fault.
- Manual mobile screenshot visually inspected. Generated transparent artwork is encoded as error-navigation.webp (about 321 KB).

Production rollout still requires Render deployment/migration 0010/runtime grants, the shared TELEGRAM_BOT_API_KEY in backend and bot, and frontend deployment. No live customer request was submitted to production and no live Telegram messages were sent during development. These enquiries are not paid orders and no wholesale price, minimum order policy or delivery promise is invented.
