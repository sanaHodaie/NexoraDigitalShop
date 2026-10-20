# Nexora storefront integration

This submitted standalone package is preserved as reference. The storefront runtime now lives in `backend/app/{domain,application,infrastructure,presentation}/assistant*.py` and is mounted by the existing FastAPI application.

Do not deploy this standalone server alongside the store. It does not inherit the store CSRF, Redis limits, permissions, or live database catalogue. See `backend/ASSISTANT.fa.md` at the repository root for configuration, design changes, review findings, tests and limitations.
