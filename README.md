# Nexora Digital Shop

React/Vite storefront connected to an ASP.NET Core Web API. Product catalog and search, registration/login, account cart and wishlist, order creation, and newsletter subscriptions use the API. The database is SQLite; the catalog is seeded from `backend/Nexora.Api/Data/products.json` on first run.

## Run locally

Install Node.js and the .NET 10 SDK, then in separate terminals:

```bash
cd backend/Nexora.Api
dotnet dev-certs https --trust
dotnet run --launch-profile Nexora.Api
```

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` to `https://localhost:7043`; the browser talks to Vite, so it does not connect directly to the backend development certificate. For mobile testing over a LAN IP, serve the frontend over trusted HTTPS so the browser can store the Secure authentication and CSRF cookies.

## Deployment

The Vite development proxy is not included in `npm run build`. A static frontend
deployment alone does not run the ASP.NET API. Configure the public site's server
to route `/api/*` to the running ASP.NET Core application, before the SPA HTML
fallback. Both frontend and API must be reachable through the same HTTPS origin;
do not point the deployed browser at `localhost:7043`.

Verify `https://YOUR_SITE/api/csrf` returns JSON with a token and a Secure CSRF
cookie, not `index.html`, a 404, or a redirect to an unreachable API address.
Configure `ConnectionStrings:Store` via environment or your secrets manager.
Back up the SQLite database and persist ASP.NET Core Data Protection keys across deployments.

### This site's Vercel setup

`vercel.mjs` routes `/api/*` to the HTTPS ASP.NET host configured in
`NEXORA_API_ORIGIN`. It preserves the `/api` prefix and keeps requests, cookies,
and CSRF tokens on the storefront's origin. Do not add a browser-side API URL or
disable CSRF to work around deployment errors.

1. Publish `backend/Nexora.Api` to a host that runs .NET 10 and provides persistent
   storage for SQLite. Publishing the Vite frontend on Vercel does not run this
   project. The backend HTTPS `/api/csrf` endpoint must work before proceeding.
2. In Vercel **Project Settings → Environment Variables**, set `NEXORA_API_ORIGIN`
   to the real API origin, for example `https://YOUR_API_HOST` (no `/api` suffix).
   Configure the environments you deploy to. This is a server-side setting, not a
   `VITE_` variable; do not include credentials in the URL.
3. Redeploy after changing the variable because routing is generated at build time.
4. Verify `https://nexora-digital-shop.vercel.app/api/csrf` returns JSON, then test
   registration, `/api/auth/me`, and logout in a real browser. No redirect to the
   backend hostname should occur.

Without a backend origin, API requests intentionally return a JSON 503 response
instead of the SPA's HTML or a nonexistent API endpoint. This fallback does not
provide authentication: a deployed ASP.NET backend is still required.

See [Vercel external rewrites](https://vercel.com/docs/routing/rewrites) and
[Vercel configuration](https://vercel.com/docs/project-configuration/vercel-ts).

## API

- `GET /api/products?q=...&category=...`, `GET /api/products/{id}`
- `GET /api/csrf` (required before writes; send `X-CSRF-TOKEN`)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/account/cart`, `PUT /api/account/cart/{id}` with `{ "quantity": 1 }`, `DELETE /api/account/cart`
- `GET /api/account/wishlist`, `PUT /api/account/wishlist/{id}`, `DELETE /api/account/wishlist/{id}`
- `POST /api/account/orders`, `GET /api/account/orders`
- `POST /api/newsletter` with `{ "email": "..." }`

The server derives product prices and stock from its database, never from browser inputs. Authentication uses an HttpOnly, Secure, SameSite cookie and CSRF tokens; write endpoints require a token. Cart and wishlist are private per account. Registration requires a password of at least 12 characters. Auth and newsletter endpoints are rate limited.

**Order status is `pending_payment`**: no payment gateway is configured. Creating an order reserves stock and records the order, but does not collect money or finalize fulfillment. Before production use, integrate a real provider with a verified server-side callback, cancellation/refund flows, reservation expiry and release, an address and shipping workflow, email delivery, administrator catalog and stock management, database migrations, and a durable database suitable for your traffic. The old decorative testimonials and article content are static editorial content. Prices are currently seeded in USD and converted to rials at a fixed display rate in the frontend; choose a single authoritative rial pricing model before accepting payments. Do not advertise checkout as paid until those steps are complete.

## Checks

`npm run build` and `npm run lint`. With .NET installed, run `dotnet build backend/Nexora.Api/Nexora.Api.csproj` and exercise registration, cart, and order endpoints against a fresh database.
