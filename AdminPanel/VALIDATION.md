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

## Unified order register and invoice design

- Approved Telegram wholesale requests now appear alongside site orders in a permission-gated, searchable, paginated register with a source filter. IDs remain source-qualified; approval does not create a paid site order or stock reservation. Site amounts use their stored rial conversion rate; wholesale totals remain exact strings/BigInt.
- Telegram detail/download uses the existing saved PDF endpoint. Existing PDF bytes, unique tracking codes and approval idempotence are preserved.
- New PDF layout uses embedded Vazirmatn, a blue brand header, two-column customer information, repeated table headers, totals, delivery/warranty guidance and a blank bottom-left management stamp/signature box on the final page. HTML invoice guidance/signature placement was aligned too. No fixed warranty duration or shipping promise is invented.
- A Persian sample PDF was rendered and visually inspected. Long 50-line invoices are tested for page bounds and final-page signature placement.
- Backend: 249 passed, 3 skipped; Ruff passed. Frontend TypeScript, production build, Node tests and fixture browser workflow passed. Browser coverage includes both order sources, Telegram filtering/detail/canonical PDF link, and order layout at 320/390/1024/1440px. Real Telegram delivery and production login were not exercised.

## Compact requests and shared invoice sheet

- Site and wholesale invoices share one React InvoiceSheet and the same printable HTML renderer. Wholesale amounts remain exact integers/BigInt; approved status never implies paid, no warranty card or stock reservation is fabricated. Printable wholesale HTML uses saved customer/line/terms snapshots, escapes customer input, requires orders:read and preserves canonical PDF bytes.
- Telegram requests show compact summary rows; full information, staff actions and the invoice open in a detail modal. Search and bounded 20/50/100-row pagination reduce page navigation. The navigation scrollbar is hidden without disabling scrolling.
- Backend full suite: 251 passed, 3 skipped. Focused checks cover printable HTML permissions/escaping, PDF byte preservation, request search and page size. Ruff, TypeScript, production build and Node tests passed.
- Chromium fixture workflow passed: compact multi-request list, full detail/approval, shared invoice sheet/actions, source filtering, desktop/mobile layout and computed hidden-sidebar-scrollbar style. Desktop/mobile request list and shared invoice screenshots visually reviewed. No real customer/Telegram messages were sent.
