# Nexora Digital Shop

Persian/RTL React + Vite storefront with **Python, FastAPI, Pydantic 2,
SQLAlchemy 2, PostgreSQL and Alembic**.

## Structure

```text
src/                         React storefront
public/                      Public images and favicons
backend/
  app/
    main.py                  FastAPI app, middleware, errors
    config.py                Pydantic environment settings
    db.py                    SQLAlchemy engine and request sessions
    models.py                Database models
    schemas.py               Pydantic request/response contracts
    security.py              Passwords, sessions, CSRF, rate limiting
    routers/                 Authentication, catalogue, account endpoints
    seed.py                  Idempotent catalogue seeding
  alembic/                   Versioned schema migrations
  data/products.json         Initial catalogue
  tests/                     API, security and migration checks
  legacy/Nexora.Api/          Archived ASP.NET source and local data
  pyproject.toml / uv.lock    Python dependencies
  start.py                   Migrate, seed, then start Uvicorn
compose.yaml                 Local PostgreSQL + API
render.yaml                  Optional free Render API deployment
vercel.mjs                   Vite hosting and same-origin API proxy
```

The ASP.NET source is archived and no longer used. Existing SQLite files are
preserved under `backend/legacy/Nexora.Api`; they are **not automatically imported**.
Use a new, empty PostgreSQL database. The new Argon2 password hashes and session
format are not interchangeable with ASP.NET hashes/cookies. A populated legacy
store needs a separate data migration/password-reset plan before switching.

## Run locally

Install Python 3.13, [uv](https://docs.astral.sh/uv/), Node.js and PostgreSQL.
With Docker installed, start both the API and a persistent local database:

```sh
docker compose up --build
```

Or start only PostgreSQL with `docker compose up -d db` (or install PostgreSQL
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

On **Vercel**, set `NEXORA_API_ORIGIN=https://YOUR_BACKEND_HOST` (without `/api`),
then deploy the latest commit. Root Directory: repository root; framework: Vite;
build: `npm run build`; output: `dist`. The proxy preserves `/api`, cookies and
same-origin CSRF; do not point the browser directly to the backend hostname.

`/api/products` should return a JSON array; `/api/csrf` a token. `/api/auth/me`
returns 401 when logged out. Without an API origin, the configured fallback
returns JSON 503 `BACKEND_NOT_CONFIGURED`. Vercel plain-text 404, even on
`/api/backend-unavailable`, indicates an outdated or incorrectly rooted
deployment. Deploy the repository, not just `dist` or an older release.

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

React contracts remain camelCase with `{ "error": "..." }` failures. Passwords
use Argon2. Login cookies contain random tokens; only token hashes and expiration
dates are stored in PostgreSQL. Logout revokes the session. Signed CSRF tokens
are bound to the browser cookie and current session. API responses are `no-store`.
Authentication shares a global limit of 10 requests/minute; newsletter allows 5.
Run one Uvicorn worker; multiple workers require a shared limiter store.

Cart/wishlist/orders are account scoped. Checkout uses server prices and atomic
stock reservations in one transaction, with $9.99 shipping below $99. Orders stay
`pending_payment`; there is no real payment integration. Existing fixed rial
conversion in the frontend is unchanged.

## Account area

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
uv run ruff check app tests alembic start.py
```

Quick tests use isolated SQLite databases **only as test doubles**. Set
`TEST_DATABASE_URL` to a dedicated PostgreSQL test database to run the same suite
against PostgreSQL, including competing-order inventory checks. Tests create and
drop unique `nexora_test_*` schemas; never supply production credentials.

At the repository root: `npm run build`, `npm run lint`, and
`node --test scripts/api-client.test.mjs scripts/vercel-config.test.mjs`.
`scripts/check-auth.mjs` defaults to API port 8000 and UI port 3001;
`NEXORA_SKIP_API=1` runs only its mocked browser tests, not live API validation.
