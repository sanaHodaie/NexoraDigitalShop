# Validation — 2026-11-06

- Backend regression suite: **238 passed, 3 skipped** using isolated SQLite test data.
  PostgreSQL concurrency / optional service checks are skipped when their services are not configured.
- Final targeted native-session/local-admin suite after adding the web-preview CORS test: **10 passed**.
- App TypeScript check: passed.
- App client/financial validation: **8 tests passed** (5 API and 3 invoice tests).
- Storefront/admin TypeScript check and Vite build: passed.
- Telegram bot regression suite: **68 passed, 2 skipped** (optional database checks).
- Expo production web export: passed.
- Expo Android and iOS platform bundle exports: passed. These are JS/Hermes bundles, not APK/IPA builds.
- Chromium against the Expo web development server: failed/successful login, dashboard,
  request detail, private note save, Persian numeric price, review before approval,
  final tracking/PDF action, products, activity, logout, and widths 320/390/1024 passed.
  Browser API responses were fixtures. No real Telegram message or production customer mutation was performed.
- Backend native approval integration verifies that native download returns the exact stored PDF bytes,
  repeated approval preserves its tracking code, and delivery remains queued until a worker processes it.
- Local-admin setup test verifies password hashing, repeatable reset, permissions,
  and refusal of remote database URLs.

Not verified here: physical Android/iOS execution, device keychain restore, native sharing UI,
APK/IPA installation, live notification/PDF delivery, and the previously reported production login discrepancy.
Follow README.fa.md on the user's local setup for these checks. No cloud service was newly provisioned.
