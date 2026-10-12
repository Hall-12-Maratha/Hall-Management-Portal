# Security Design - Hall 12 Marathas Portal

Security decisions of the Next.js full-stack version. Implementation lives in
`frontend/src/lib/server/` and the route handlers under `frontend/src/app/api/`.

## Authentication

### Password storage
- Passwords, OTPs and nothing else are hashed with **bcrypt** (cost 12, `bcryptjs`, `$2b$` hashes compatible with the previous Python backend).
- Passwords are limited to 72 bytes (bcrypt's input limit) and never logged.

### Tokens
- **Access token**: JWT (HS256, `jose`), 15 minutes, kept in browser memory only (never localStorage or cookies). Sent as `Authorization: Bearer`.
- **Refresh token**: JWT, 7 days, in an `httpOnly` cookie (`refresh_token`, `Path=/`, `SameSite=lax`, `Secure` in production). The API is same-origin, so no cross-site cookie settings are needed.
- Token types (`access`, `refresh`, `signup`, `change_password`) are enforced by a `type` claim; one cannot be used in place of another.
- Password-reset tokens carry a fingerprint of the current password hash, so they are single-use.
- Refresh tokens are stateless; logout clears the cookie. Deactivating an account (`is_active = false`) blocks it immediately because every request re-reads the user row.

### Student onboarding
1. The hall office uploads the roll list; identities are always `<roll>@iitk.ac.in`.
2. Setup codes (8 chars, `crypto.randomInt`) are generated on export and stored on the roll row; they are consumed on first use.
3. Wrong setup codes are rate limited (10 per roll per 15 minutes).

### Password recovery
- 6-digit OTP (`crypto.randomInt`), hashed with bcrypt before storage, 10-minute expiry, 5 verification attempts, 3 requests per email per 15 minutes. The response never reveals whether an email is registered.

### Staff accounts
- Created by the hall office with a server-generated 16-character temporary password shown once; `must_change_password` forces a change on first login.

## Rate limiting
- Stored in the `rate_limits` table (fixed 15-minute window) so limits hold across serverless instances: OTP 3/email, failed logins 5/identifier (cleared on success), setup codes 10/roll.

## Authorization
- Every handler calls `requireUser` / `requireRole`, which load the user from the database; the role in the JWT is never trusted on its own.
- Frontend layouts redirect by role for UX only; the server is the enforcement point.

## Booking integrity
- Serving a booking is a single conditional `UPDATE ... WHERE status = 'booked'`, so concurrent scans or clicks cannot double-serve.
- Bookings cannot be created outside the item's open window, and one active booking per student per item is enforced.

## Input validation
- All bodies and query strings are validated with zod; failures return `422` with field-level messages.
- CSV upload: `.csv` extension, 1 MB limit, strict UTF-8 decoding, roll-number pattern check.
- Database access uses Drizzle (parameterised); the few raw SQL statements use tagged templates with explicit casts.

## Secrets
- Read from environment variables (`frontend/.env.local` locally, Vercel project settings in production). `.env.example` lists them; no secrets are committed.

## Future improvements
- [ ] CSRF double-submit token for the refresh endpoint (currently mitigated by `SameSite=lax` and the Bearer-only API)
- [ ] Refresh-token revocation list
- [ ] Audit log for account and booking state changes
- [ ] Content Security Policy headers
- [ ] Password complexity rules beyond minimum length
