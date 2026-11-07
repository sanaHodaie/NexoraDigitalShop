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

## Image-loading follow-up

- 105 catalogue previews generated and reproducibility checked: 6796 KiB of unique original files → 422 KiB of 320px WebP previews (93.8% smaller).
- Product list now virtualizes rendering in batches of four. Known catalogue previews are bundled; uploads use bounded 320/640px variants.
- API test verifies dimensions, response-size reduction, distinct ETags, immutable caching, original-byte preservation and unsupported-size rejection.
- Relevant management/API tests, app TypeScript and 10 unit tests, Vercel build, Android/iOS bundle exports and production-prefix browser workflow passed.
- Browser test verifies the bundled product image actually decodes. User-network latency was not benchmarked.

## Responsive blue theme follow-up (2026-11-07)

- TypeScript and all 10 existing client/financial tests passed. Production Vercel build and Android/iOS bundle exports passed.
- Chromium tested the production `/business` build: two-column RTL login, theme toggles before/after login, persistence through reload, full-width desktop home, right sidebar pointer hover and navigation, mobile bottom tabs, decoded product images and notification animation respecting reduced-motion.
- Existing mocked management workflow passed: wholesale preview/approval, product editing, bulk prices, XLSX selection/import, newsletter read state, site-order details and logout.
- Layout overflow checked at 320, 390 and 1024 pixels; desktop screenshots checked at 1440 pixels in both themes. API responses were fixtures; no production data or Telegram messages were sent.
- Actual deployment completion and physical-device behavior remain operator checks.

## Navigation follow-up

- Blue web scrollbars and an overlay mobile tab bar keep scrolling behind the bottom navigation, with extra content padding for the last controls.
- Navigation hover uses a 160ms blue highlight/lift and respects reduced motion. Desktop navigation closes on selection and route changes.
- TypeScript, production web build and Chromium management regression passed. Browser assertions cover blue scrollbar styling, overlay placement, usable mobile tabs and desktop auto-close after selecting Products.

- Follow-up: hid app/sidebar scrollbar tracks while retaining scrolling; removed the sidebar chevron and moved its touch/keyboard toggle to the N logo. TypeScript and production web build passed; desktop screenshot inspected.

## Reference-inspired login redesign

- Blue/lilac glass form, raised lock badge, gradient submit button and original bundled SVG laptop/plant illustration. Responsive two-column desktop layout and single-column phone form; both themes visually inspected in Chromium screenshots.
- No SSO or persistent-web-session controls were introduced because those auth capabilities are not implemented. Existing password visibility, validation, error reporting and connection diagnostics remain.
- TypeScript, 10 existing tests, Vercel build, Android/iOS exports and Chromium management regression passed. Browser login uses fixtures; production credentials and physical devices were not tested.

## Login photograph follow-up

- Email placeholder/input aligned right. Replaced the vector workspace with the existing catalogue laptop photograph, bundled locally (20,200 bytes), with perspective, subtle float and hover tilt. Motion stops when the OS reduced-motion preference is enabled.
- TypeScript, production web build and Android/iOS exports passed. Chromium checked email alignment and successful image decoding; desktop screenshot inspected. Browser checks also compare animation frames and verify reduced-motion freezes the laptop.

- Login artwork direction follow-up: generated a right-facing photorealistic laptop cutout from the previous photo, exported as an 800px RGBA WebP with transparent corners. Removed the image frame and decorative shape behind it. Swapped the brand to the right and theme toggle to the left. TypeScript and production web build passed; desktop screenshot inspected.
