# Security and threat model

## OAuth boundary

The production allowlist is tested in `src/lib/auth/scopes.test.ts`. The app requests identity scopes and `drive.file` only. It can access files it created or files the user explicitly opens with the app. Gmail automation must use a separate future integration and must not expand this OAuth client silently.

## Stored credentials

- Google access, refresh, and ID tokens are encrypted through Cloud KMS in the Better Auth database adapter.
- Anthropic keys are encrypted through Cloud KMS and the ciphertext document is stored in the user's app-created Drive folder.
- Shortcut tokens contain 256 random bits. Neon stores only an HMAC-SHA-256 value using `SHORTCUT_TOKEN_PEPPER`.
- KMS additional authenticated data binds OAuth tokens to the user and token field, and Anthropic keys to the user.

Cloud KMS ciphertext records carry their key version. Rotation creates a new primary version but does not re-encrypt old data automatically. Re-encrypt active records and Drive vaults, audit remaining version references, and retain old versions through the Neon recovery window before disabling them.

## Honest limitation

Encryption protects stored copies and database exports. The Vercel function must decrypt a user's Anthropic key in memory to call Anthropic. A compromised deployment, KMS principal, or malicious server dependency can access keys while they are used. Users should create a dedicated Anthropic workspace/key, configure spending limits, monitor usage, and rotate a key after suspected misuse.

## Receipt residency

The durable image and JSON copies live in the user's Drive. Vercel processes bytes transiently in memory. Do not log request bodies, extracted line items, API keys, OAuth tokens, or Drive file contents. Neon scan jobs contain IDs and statuses only.

## Request controls

- Custom cookie-authenticated mutation routes require an exact same-origin `Origin` header.
- Web accounts are limited to 20 scans per minute and 500 per rolling day.
- Shortcut tokens are limited to 5 scans per minute and 100 per rolling day.
- Image format is identified by magic bytes and limited to 3.5 MB.
- Shortcut revocation is checked in Neon on every request; no stateless JWT is accepted.

## Dependency policy

Commit `package-lock.json`, use `npm ci` in CI, review Dependabot/Renovate updates, and run `npm audit` on every dependency update. As of the initial migration, current stable Next.js and Drizzle tooling report moderate advisories in bundled PostCSS and development-only esbuild paths. Do not force incompatible versions; update when upstream releases a compatible fix and keep development servers private.
