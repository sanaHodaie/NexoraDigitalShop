# Google sign-in

The UI uses Google Identity Services (popup mode). The backend validates the ID
token's signature, expiry, issuer, audience, and verified email using
`Google.Apis.Auth`. Only the public Web application client ID is required; no
client secret is used or shipped to the browser.

1. Create a Web application OAuth client in Google Cloud and configure its consent screen.
2. Add the frontend origin (scheme, host, port; no path) to **Authorized JavaScript origins**.
   For local development use an HTTPS frontend, for example `https://localhost:3000`,
   with a locally trusted certificate. Production must use HTTPS and proxy `/api`
   to this backend on the same origin. The existing authentication cookies require HTTPS.
3. Set `Authentication__Google__ClientId` on the API process to the public client ID
   ending in `.apps.googleusercontent.com`, then restart the API.
4. Open the sign-up or login form and choose the Google button. If the consent app
   is in testing, the Google account must be included in its test users.

The popup/JavaScript callback flow does not need a redirect URI. No Google access
or refresh tokens are retained. Name and verified email are stored, and the
immutable Google subject identifies returning accounts. Existing password accounts
are deliberately not auto-linked by email; use their password to sign in.
Without configuration the application still starts and email/password login works.

`UserProfiles` is created by an additive, idempotent startup upgrade to support
existing SQLite databases without losing any accounts or orders. New databases
also receive this table from EF's model. Replace the existing `EnsureCreated`
startup approach with versioned EF migrations before production schema evolution.

Reference: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

Password recovery and other social providers are not configured. The UI explains
the recovery limitation instead of pretending to send a reset email.
