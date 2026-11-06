# Validation — version 0.2, 2026-11-06

- Backend regression suite: **252 passed, 3 skipped** using isolated SQLite test data.
  PostgreSQL concurrency / optional service checks are skipped when their services are not configured.
- Final targeted admin-app/native-session suite: **21 passed**, including real XLSX/DOCX output,
  formula/control-character sanitization, per-admin monotonic notification cursors, product filters,
  raw spreadsheet preview/commit, pricing confirmation, PDF and operator password reset.
- App TypeScript check: passed.
- App client/financial validation: **10 tests passed** (7 API and 3 invoice tests).
- Storefront/admin TypeScript check and Vite build: passed.
- Telegram bot regression suite: **68 passed, 2 skipped** (optional database checks).
- Combined Vercel storefront + `/business` production export: passed.
  Prefix routes, same-origin API, CSP, real local product images and private/noindex headers verified.
- Expo Android and iOS platform bundle exports: passed. These are JS/Hermes bundles, not APK/IPA builds.
- Chromium against the `/business` production build over local HTTPS with production CSP: failed/successful login, dashboard,
  request detail, private note save, Persian numeric price, review before approval,
  final tracking/PDF action, product edit, bulk-price preview/confirmation, activity, light/dark preference,
  newsletter badge read, full site-order address/PDF action, logout, and widths 320/390/1024 passed.
  The real browser file chooser was exercised with trusted pointer input; binary import preview
  and explicit confirmation were checked against fixtures, while parser validity is covered by backend tests.
  Bottom tabs were checked for viewport bounds and actual pointer hit-testing after transitions.
  Browser API responses were fixtures. No real Telegram message or production customer mutation was performed.
- Backend native approval integration verifies that native download returns the exact stored PDF bytes,
  repeated approval preserves its tracking code, and delivery remains queued until a worker processes it.
- Local-admin setup test verifies password hashing, repeatable reset, permissions,
  and refusal of remote database URLs.

PDF font inspection confirms embedded Vazirmatn; the rendered Persian sample was visually checked.
No default administrator password is distributed. Online password reset is an explicit operator command.

Not verified here: physical Android/iOS execution, device keychain restore, native sharing/file pickers,
APK/IPA installation, live newsletter/PDF delivery, actual Vercel deployment completion and the user's production account login.
Follow README.fa.md on the user's local setup for these checks. No cloud service was newly provisioned.
