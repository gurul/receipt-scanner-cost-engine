# ShapersAI Cost Engine Web

The production web migration of the receipt-scanner cost engine. It is a Next.js 16 application designed for Vercel, Google OAuth, user-owned Drive/Sheets storage, and user-supplied Anthropic API keys.

## What users own

- Receipt images and extracted JSON in their Google Drive
- Their business configuration and cost workbook
- Their Anthropic API key and Anthropic usage charges
- Revocable credentials for each iPhone Shortcut

Neon stores authentication records, KMS ciphertext for Google OAuth tokens, Drive file IDs, Shortcut token hashes, and processing status. It does not store receipt contents or plaintext provider credentials.

## Local setup

Requirements: Node.js 20.9 or newer, a Neon database, a Google Cloud project, and Google Cloud KMS.

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

Google sign-in cannot run from the example values alone. Better Auth writes a
short-lived OAuth verifier to Postgres before redirecting to Google, and the
callback encrypts Google's tokens with Cloud KMS. All values in `.env.local`
must therefore be real, and `npm run db:migrate` must finish successfully.

### Google sign-in troubleshooting

- `Google sign-in is not configured`: create `web/.env.local`, fill every value
  from `.env.example`, and restart `npm run dev`.
- `Google sign-in cannot reach its database`: verify `DATABASE_URL` and run
  `npm run db:migrate` against that database.
- Google shows `redirect_uri_mismatch`: add
  `http://localhost:3000/api/auth/callback/google` to the Web OAuth client's
  authorized redirect URIs. An OAuth client created for an installed app or
  iPhone Shortcut cannot be reused; its application type must be Web.
- The OAuth page opens but the callback fails: verify the KMS key resource,
  service-account JSON, and `cloudkms.cryptoKeyEncrypterDecrypter` permission.

## Google Cloud setup

1. Create separate Google Cloud projects for development and production.
2. Enable Google Drive API, Google Sheets API, and Cloud KMS API.
3. Configure an external OAuth consent screen with a verified domain, homepage, privacy policy, and support email.
4. Request only `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/drive.file`.
5. Create a Web OAuth client with callback URLs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR_DOMAIN/api/auth/callback/google`
6. Create a symmetric Cloud KMS `ENCRYPT_DECRYPT` key with automatic rotation.
7. Create a service account with `roles/cloudkms.cryptoKeyEncrypterDecrypter` on that key only.
8. Minify its JSON key into `GOOGLE_CLOUD_CREDENTIALS_JSON` or replace this credential with workload identity before a higher-scale launch.

`drive.file` is an intentional product boundary. Do not add broad Drive, Sheets, or Gmail scopes to the production OAuth project.

## Vercel deployment

1. Import the repository and set the Vercel Root Directory to `web`.
2. Provision Neon through Vercel Marketplace or connect an existing Neon project.
3. Add every value from `.env.example` to Development, Preview, and Production as appropriate.
4. Set `BETTER_AUTH_URL` to the exact production origin.
5. Run `npm run db:migrate` against production before directing traffic to a new schema.
6. Deploy and test Google sign-in, onboarding, key replacement, scan/review/commit, Shortcut revocation, and both account-deletion choices.

`DATA_BACKUP_RETENTION_DAYS` must match Neon's configured point-in-time recovery window. The Settings deletion screen displays this value to users.

The scan route resizes images in the browser and rejects payloads over 3.5 MB so it stays below Vercel's 4.5 MB function request limit.

## Mobile use

The scanner is mobile-first. On iPhone and Android, **Take photo** opens the
rear camera and **Photo library** opens the device picker. Images are resized
and converted to JPEG in the browser before upload. Receipt review uses stacked
touch-friendly cards on phones and a table on larger screens.

The site includes a web-app manifest and can be added to the home screen. It is
an installable web app, not a separately distributed App Store or Play Store
binary, and scanning still requires an internet connection for Google Drive and
Anthropic. Camera capture should be tested on the final HTTPS domain before
launch.

## Commands

```bash
npm test              # domain and security tests
npm run lint          # ESLint
npm run typecheck     # strict TypeScript
npm run build         # production build
npm run db:generate   # create migration after schema changes
npm run db:migrate    # apply committed migrations
npm run db:studio     # inspect local database
```

## iPhone Shortcut

The Settings screen creates one opaque credential per device. The raw token is shown once; only a keyed hash is stored. A Shortcut should:

1. Take a photo.
2. Resize it to at most 1568 pixels on the long edge and convert it to JPEG.
3. POST the file to `https://YOUR_DOMAIN/api/shortcut/scan`.
4. Add `Authorization: Bearer USER_TOKEN`.
5. Show the returned message and open `reviewUrl` for confirmation.

The deployment owner should publish a signed Apple Shortcut template with these actions. Users paste the one-time token created in Settings. Vercel cannot sign Apple Shortcut files, so signing remains a deployment artifact performed with Apple's macOS `shortcuts sign --mode anyone` command.

## Operational documents

- [Deployment owner checklist](docs/OWNER_CHECKLIST.md)
- [Security and threat model](docs/SECURITY.md)
- [Operations and recovery](docs/OPERATIONS.md)
