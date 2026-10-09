# Change manifest

Implementation snapshot, 2026-10-08. No commit, push or online deployment performed.

## New implementation files

- `backend/LOCAL_SETUP.fa.md`
- `backend/SECURITY_ARCHITECTURE.fa.md`
- `backend/alembic/versions/0003_security_reservations.py`
- `backend/app/application/__init__.py`
- `backend/app/application/identity.py`
- `backend/app/application/orders.py`
- `backend/app/application/ports.py`
- `backend/app/application/shopping.py`
- `backend/app/bootstrap.py`
- `backend/app/core/__init__.py`
- `backend/app/core/config.py`
- `backend/app/core/logging.py`
- `backend/app/domain/__init__.py`
- `backend/app/domain/entities.py`
- `backend/app/domain/errors.py`
- `backend/app/infrastructure/__init__.py`
- `backend/app/infrastructure/crypto.py`
- `backend/app/infrastructure/database.py`
- `backend/app/infrastructure/database_security.py`
- `backend/app/infrastructure/google.py`
- `backend/app/infrastructure/grants.py`
- `backend/app/infrastructure/mail.py`
- `backend/app/infrastructure/models.py`
- `backend/app/infrastructure/rate_limit.py`
- `backend/app/infrastructure/repositories.py`
- `backend/app/infrastructure/worker.py`
- `backend/app/presentation/__init__.py`
- `backend/app/presentation/account.py`
- `backend/app/presentation/auth.py`
- `backend/app/presentation/catalog.py`
- `backend/app/presentation/dependencies.py`
- `backend/app/presentation/schemas.py`
- `backend/scripts/audit_dependencies.py`
- `backend/scripts/grants.sql`
- `backend/scripts/init-local.sql`
- `backend/scripts/provision.sql`
- `backend/tests/integration/test_api.py`
- `backend/tests/integration/test_redis.py`
- `backend/tests/integration/test_worker.py`
- `backend/tests/security/test_hardening.py`
- `backend/tests/security/test_http_and_logging.py`
- `backend/tests/security/test_recovery.py`
- `backend/tests/unit/test_boundaries.py`
- `src/pages/VerifyEmailPage.jsx`

## Changed files (including moved compatibility paths)

- `.github/workflows/backend.yml`
- `.gitignore`
- `README.md`
- `backend/.dockerignore`
- `backend/.env.example`
- `backend/DEPLOYMENT.fa.md`
- `backend/Dockerfile`
- `backend/alembic/env.py`
- `backend/app/config.py`
- `backend/app/db.py`
- `backend/app/main.py`
- `backend/app/models.py`
- `backend/app/recovery.py`
- `backend/app/routers/account.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/catalog.py`
- `backend/app/schemas.py`
- `backend/app/security.py`
- `backend/app/seed.py`
- `backend/pyproject.toml`
- `backend/start.py`
- `backend/tests/conftest.py`
- `backend/tests/test_api.py`
- `backend/tests/test_recovery.py`
- `backend/uv.lock`
- `compose.yaml`
- `package-lock.json`
- `render.yaml`
- `scripts/api-client.test.mjs`
- `scripts/check-auth.mjs`
- `scripts/vercel-config.test.mjs`
- `src/App.jsx`
- `src/api/client.js`
- `src/components/Auth/AuthModal.jsx`
- `src/components/Auth/ChangePassword.jsx`
- `src/context/ShopContext.jsx`
- `src/pages/AccountPage.jsx`
- `vercel.json`
- `vite.config.ts`

## Pre-existing untracked local development files, preserved

- `.dockerignore`
- `Dockerfile.dev`

The old `backend/tests/test_api.py` and `test_recovery.py` moved into the integration/security groups; their coverage was adapted and expanded. README.md, compose.yaml and vite.config.ts already contained local edits before this task. No environment secret files were read or added to Git.
