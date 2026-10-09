# Nexora Digital Shop

Persian/RTL React + Vite storefront with **Python, FastAPI, Pydantic 2,
SQLAlchemy 2, PostgreSQL and Alembic**.

## Structure

```text
src/                         React storefront
public/                      Public images and favicons
backend/
  app/
    domain/                  Pure entities, money and session/order invariants
    application/             Identity, shopping and order use cases + repository ports
    infrastructure/          Sync SQLAlchemy, Redis, crypto, Google, mail and outbox worker
    presentation/            Thin FastAPI routers, Pydantic contracts and dependencies
    core/                    Validated configuration and redacted JSON logging
    bootstrap.py             Composition root: binds ports to adapters
    main.py                  HTTP assembly, CSRF, CORS, headers and exception handlers
    seed.py                  Idempotent catalogue seeding
  alembic/                   Versioned schema migrations
  data/products.json         Initial catalogue
  tests/                     unit/, integration/, security/
  legacy/Nexora.Api/          Archived ASP.NET source and local data
  pyproject.toml / uv.lock    Python dependencies
  start.py                   Migrate with owner credentials; supervise API + worker
compose.yaml                 Local PostgreSQL + Redis + API/worker + Vite
render.yaml                  Optional free Render API deployment
vercel.json                  Vite hosting, frontend CSP and same-origin API proxy
```

The ASP.NET source is archived and no longer used. Existing SQLite files are
preserved under `backend/legacy/Nexora.Api`; they are **not automatically imported**.
Use a new, empty PostgreSQL database. The new Argon2 password hashes and session
format are not interchangeable with ASP.NET hashes/cookies. A populated legacy
store needs a separate data migration/password-reset plan before switching.

## Run locally

For installation without Docker, follow [Windows local setup](backend/LOCAL_SETUP.fa.md).

Install Python 3.13, [uv](https://docs.astral.sh/uv/), Node.js and PostgreSQL.
With Docker Desktop running, start the frontend, API and persistent local database:

```sh
docker compose up -d --build
```

Open `http://localhost:3000`; API docs are at `http://localhost:8000/docs`.
No separate Python/Node terminal is needed with this command. Stop any existing
local servers on ports 3000 and 8000 first. This Compose setup uses the local
database only and does not connect to Neon. Rebuild after source changes with
the same command. Use `docker compose logs -f` for logs and `docker compose stop`
to stop the local services; `docker compose start` starts them again. Database
data persists in the named volume (do not use `down -v` if you want to keep it).
The frontend container runs Vite for local development, not production hosting.
Existing Compose volumes need the role upgrade once before the new API starts:
`Get-Content backend/scripts/init-local.sql | docker compose exec -T db psql -U nexora -d nexora`.
This preserves data; do not delete the volume. Local Compose disables email
verification for checkout because no email provider is configured. Production
keeps verification enabled.

Alternatively, start only PostgreSQL with `docker compose up -d db` (or install PostgreSQL
directly), then run the API outside Docker:

```sh
cd backend
uv sync --frozen
# Copy .env.example to .env (PowerShell: Copy-Item .env.example .env).
uv run python start.py
```

Set `DATABASE_URL` in `backend/.env` for your PostgreSQL instance. `start.py`
applies Alembic migrations, inserts missing catalogue products without resetting
stock/prices, and starts `http://127.0.0.1:8000`. Migration failures stop startup.

In another terminal at the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api/*` to port 8000. Interactive
backend documentation is at `http://127.0.0.1:8000/docs`.

## Deployment

Publishing the Vite frontend alone does **not** start the Python API. See the
Persian walkthrough: [استقرار رایگان](backend/DEPLOYMENT.fa.md).

Set these variables on the **backend**, never in public `VITE_` settings:

| Name | Purpose |
| --- | --- |
| `ENVIRONMENT` | `development` locally; `production` on the host |
| `DATABASE_URL` | PostgreSQL URL (`postgresql://` or `postgresql+psycopg://`) |
| `SECRET_KEY` | Persistent random secret, at least 32 characters in production |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth Web Client ID |
| `PORT` | Listen port; default 8000, automatically supplied by Render |

Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
Production cookies are Secure, HttpOnly, SameSite=Strict with `__Host-` names;
the public hosting ingress must provide HTTPS. Development uses different,
non-Secure cookie names for local HTTP. Untrusted forwarded headers are not used.

The Render blueprint requests the Free service plan and external PostgreSQL.
It does not provision a paid database/disk. Hosting accounts, database credentials
and actual remote deployment are still needed; configuration files alone do not
make the online API work.

On **Vercel**, `vercel.json` is the active configuration. Its first rewrite
proxies `/api/:path*` to the current Render API before the SPA fallback. Update
that HTTPS destination when changing hosts. `NEXORA_API_ORIGIN` is not read by
this JSON configuration. Keep the frontend and API same-origin from the browser.
Root Directory: repository root; build: `npm run build`; output: `dist`.
`/api/products` must return JSON, `/api/csrf` a token, and `/api/auth/me` returns
401 when logged out.

### Google sign-in

Create a Google OAuth Web application client and authorize the frontend origin
(for example `https://nexora-digital-shop.vercel.app`). Set `GOOGLE_CLIENT_ID` on
the API. The official library verifies signature, issuer, audience, expiry and
verified email. Returning users are identified by Google's immutable subject;
password accounts are not automatically linked by email. No Google client secret
or access/refresh token is shipped to the browser.

## API and behavior

- `GET /api/products?q=...&category=...&limit=...`, `GET /api/products/{id}`
- `GET /api/csrf`; mutations require its token in `X-CSRF-TOKEN`
- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/logout`
- `GET /api/auth/me`, `/api/auth/providers`
- `GET /api/account/cart`, `PUT /api/account/cart/{id}`, `DELETE /api/account/cart`
- `GET /api/account/wishlist`, `PUT`/`DELETE /api/account/wishlist/{id}`
- `GET`/`POST /api/account/orders`, `POST /api/newsletter`, `GET /health`

React contracts remain camelCase and errors preserve `error`, adding `code`.
Registration now returns a generic **202** and requires a separate login, avoiding
account enumeration. Password change requires `currentPassword` and `newPassword`.
`emailVerifiedAt` and `reservationExpiresAt` are additive response fields.

New routes: `/api/auth/logout-all`, `/api/auth/request-verification`,
`/api/auth/verify-email`, `/api/auth/confirm-email-change`, `/api/account/email`,
`/api/account/orders/{id}/cancel`, and permission-protected
`/api/management/orders/{id}/confirm-payment`. The last route is manual management
confirmation, **not a payment gateway or a public payment webhook**.

Passwords use Argon2; session/action-token tables store SHA-256 hashes of random
256-bit tokens. Sessions have idle (30 minute default), absolute (14 day default)
timeouts, last-use timestamps and revocation. Password changes rotate the current
session and revoke all previous sessions. CSRF remains bound to browser + session.

Production requires Redis for atomic, shared rate limits with independent IP and
account buckets. Unknown/known account failures and recovery requests share public
responses. CORS defaults to no cross-origin access; exact origins are configurable.
Frontend and API security headers use separate CSPs; inline scripts/eval are not
allowed in the frontend policy. Inline styles remain necessary for React motion.

Checkout uses database prices, Decimal totals, user/order row locks and conditional
inventory updates in one transaction. Unpaid reservations expire after 20 minutes;
the durable worker releases stock once. Cancelling also releases stock. Payment
confirmation requires a database permission and is idempotent per payment reference.

## Email and operational requirements

Set `RESEND_API_KEY`, verified `MAIL_FROM` and `FRONTEND_URL`. Verification is
required for checkout by default. Local-only demonstrations can set
`REQUIRE_VERIFIED_EMAIL=false`; do not use this to bypass production verification.
Recovery and verification links expire after 30 minutes and are consumed once.

Email requests are transactionally queued in PostgreSQL, not BackgroundTasks.
The outbox encrypts delivery payloads (including raw link tokens) with a key derived
from `SECRET_KEY`, clears successful payloads, claims leased jobs with SKIP LOCKED,
retries up to six attempts and records dead-letter failures. Only token hashes are
in authentication token tables; the delivery queue is an encrypted exception.
Keep SECRET_KEY stable or outstanding encrypted jobs cannot be decrypted.

`start.py` supervises separate API and worker processes. To deploy the worker
separately set `RUN_WORKER=false` on the web process and run
`python -m app.infrastructure.worker` using the runtime credential. PostgreSQL
outbox was chosen instead of a Redis queue so the account change and email enqueue
commit atomically; Redis is reserved for distributed request limits.

Runtime `DATABASE_URL` must use a restricted application role; production startup
rejects administrative/table-owner/schema-create roles. `MIGRATION_DATABASE_URL`
uses a separate migration owner and is removed from child-process environments.
Use `scripts/provision.sql` for initial role setup. Startup grants only the required
table/column access; runtime cannot modify RBAC tables or delete/update audit logs.
For a separate migration job, use `MIGRATE_ON_START=false` on the runtime and apply
`scripts/grants.sql` after Alembic as the migration owner. No `.env` is tracked.

Migration **0003** revokes old sessions, leaves existing password users unverified,
and marks old unpaid reservations due for expiry by the worker. Back up the database
before deployment and review older unpaid orders. See the full implementation and
validation report: [Architecture/security report](backend/SECURITY_ARCHITECTURE.fa.md).

Signed-in users open `/account` from the header user icon. The responsive Persian
dashboard includes order history and details, wishlist, cart, profile editing,
and logout. Profile updates use `PATCH /api/account/profile`; order details use
`GET /api/account/orders/{id}` and are restricted to the order owner. Deploy the
backend together with the frontend to enable these endpoints.

Account and login UI are loaded on demand. The private account route uses
`noindex, nofollow` metadata and Vercel response headers; API authentication
protects its data. Browser checks cover 320–1440px layouts in both themes.

## Migrations and checks

```sh
cd backend
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe schema change"
# Review generated revisions before applying them.
uv run pytest
uv run ruff check app tests alembic scripts start.py
uv run python scripts/audit_dependencies.py
```

Quick tests use isolated SQLite databases **only as test doubles**. Set
`TEST_DATABASE_URL` to a dedicated PostgreSQL test database to run the same suite
against PostgreSQL, including competing-order inventory checks. Set `TEST_REDIS_URL`
to a dedicated Redis test database for the shared-limit test. Tests create and
drop unique `nexora_test_*` schemas; never supply production credentials.

At the repository root: `npm run build`, `npm run lint`, and
`node --test scripts/api-client.test.mjs scripts/vercel-config.test.mjs`.
`scripts/check-auth.mjs` defaults to API port 8000 and UI port 3001;
`NEXORA_SKIP_API=1` runs only its mocked browser tests, not live API validation.
