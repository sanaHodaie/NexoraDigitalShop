# Documentation publication sources

The delivered, self-contained PDFs are in `../exports/`:

- `Nexora-Documentation-FA.pdf` — Persian / RTL.
- `Nexora-Documentation-EN.pdf` — English / LTR.

The accompanying HTML files embed the fonts and need no third-party assets. They contain a local pagination script; the PDFs contain no JavaScript.

## Source and publication scope

Baseline: repository revision `431ea94`, 15 November 2026, Asia/Tehran. This is a source-code snapshot, not a live environment inventory or a fresh production acceptance report. No private env files or live customer records were read for publication.

`content.py` contains curated bilingual explanations and the English operational translation. `build.py` combines those with the committed READMEs/runbook and the extracted `inventory.json`. `openapi.snapshot.json` is the matching API contract. The inventory covers 91 operations, 81 distinct paths, 33 contract schemas, 22 store tables and 12 migration files. Three independent bot-state tables are described separately.

The two editions cover the same system. Chapter/page counts differ because the Persian runbook is retained in its detailed existing structure and the English edition groups some topics differently.

## Rebuild

From the repository root, in a documentation build environment with Python, Node and Chromium:

```sh
python docs/documentation/build.py
node docs/documentation/render.mjs
python docs/documentation/verify.py
```

The HTML builder uses the Python standard library and bundled Vazirmatn fonts. Rendering uses Node built-ins, loopback HTTP and Chromium DevTools. Verification uses PyMuPDF; this is a documentation tool, not a new production application dependency. Chromium is launched headlessly with `--no-sandbox` for the managed build environment; use an appropriately isolated machine for this build. No remote browser destinations are loaded during export.

Before rebuilding for another code revision, regenerate `inventory.json` and `openapi.snapshot.json` from the reviewed FastAPI OpenAPI/SQLAlchemy metadata and Alembic source, update the recorded revision/date/counts, and review both language sources. Do not just change the cover date while keeping an old contract snapshot. `build.py` expects current root-relative source paths.

## Validation

`render-report.json` records pagination results. `validation.json` records read-back checks against the actual PDF files: page count/size, empty pages, embedded fonts, bookmarks, all API paths and all store table identifiers. The build also checks content-frame overflow. Samples from cover, contents, runbooks, API, schema and final sections were rendered and visually inspected.

The release files have selectable text, internal contents links, outlines, A4 pages and embedded fonts. This does not establish formal PDF/UA conformance. The operational examples are reviewed source instructions; live mail/Telegram/production credentials were not exercised as part of publishing these PDFs.

## Decisions the owner still needs to supply

Actual shipping/return policy, warranty contracts, legal/tax requirements, service plan suitability, RPO/RTO, production backup/alert ownership, staff escalation contacts and retention periods are not invented. The handbooks identify them as open operational decisions. Keep all credentials and customer records outside documentation/Git.
