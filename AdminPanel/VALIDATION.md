# Unified management migration validation

The standalone Expo app was removed after transferring its ready features to `/admin`.
The app's public art, Vazirmatn fonts/licenses and 105 optimized catalogue previews were moved into `public/assets/admin`.
Native session routes and bearer/CSRF exemptions were retired; shared management APIs retain role checks and cookie/CSRF authentication.
No database schema was dropped or migration history removed. No new secrets or npm dependencies are required.

Checks completed:

- `npm run lint` and `npm run build:vercel`: passed. The build contains only storefront and admin entries; no Expo build/install step.
- `node --test scripts/*.test.mjs`: passed, including invoice-number normalization/exact BigInt totals and deployment redirects/cache policies.
- `backend/.venv/bin/python scripts/build-admin-thumbnails.py --check`: passed, 105 previews, 6796 KiB originals → 422 KiB previews.
- Backend full pytest: 246 passed, 3 skipped; skipped cases require external services. Subsequent focused cookie/CSRF, public-health, export, local-admin and invoice checks: 23 passed.
- Backend Ruff: passed.
- Chromium production-build workflow (`scripts/check-admin-unified.mjs`): passed with fixture API responses. Verifies login failure/success, password visibility, right-aligned email placeholder, correct two-column login, local art decoding, health check, dark/light persistence, dashboard poster, wholesale preview before confirmation, product edit/activation/type filter, XLSX preview/commit, bulk pricing snapshot, XLSX/DOCX audit downloads, newsletter read cursor, site-order details/PDF, content/articles/assistant and layout at 320, 390, 768, 1024 and 1440px.
- Login light/dark, mobile and dashboard screenshots visually reviewed.

Browser fixtures do not contact real customers, mutate production records or send Telegram messages.
The actual production login, Vercel/Render deployment completion and Telegram delivery remain operator checks.
Backend tests used isolated SQLite test databases here; PostgreSQL runs in the existing CI job.
