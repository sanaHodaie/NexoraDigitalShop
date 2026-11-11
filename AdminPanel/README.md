
# Nexora Management Panel

This single responsive management panel is integrated with the Nexora storefront and FastAPI backend.
Run `npm run dev` from the repository root, then open `http://localhost:3000/admin`.
See the [complete Windows runbook](../docs/LOCAL_RUNBOOK.fa.md) for backend, frontend, Telegram and online-login troubleshooting.
Run `npm run build` from the root to build the storefront and panel.
The former native app has been retired. See [migration and test steps](MIGRATION.fa.md).

Authentication uses real Nexora accounts. An operator must explicitly grant
management permissions; there are no default login credentials.

See [setup, permissions and deployment](../backend/ADMIN_PANEL.fa.md).
