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

Open `http://localhost:3000`. Vite proxies `/api` to `https://localhost:7043`. The browser must accept the local development certificate; keep both frontend and API behind HTTPS in deployment with the same origin. Configure `ConnectionStrings:Store` via environment or your secrets manager. Back up the SQLite database and persist ASP.NET Core Data Protection keys across deployments.

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
