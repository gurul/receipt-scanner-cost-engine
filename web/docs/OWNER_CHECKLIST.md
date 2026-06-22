# Deployment owner checklist

Do not commit secret values or paste them into issues or chat. Store local
development values in `web/.env.local` and production values in Vercel's
encrypted environment settings.

## Owner decisions

- [ ] Final production domain
- [ ] Public app name and support email
- [ ] Privacy-policy and terms URLs on that domain
- [ ] Neon backup-retention window, from 1 to 30 days
- [ ] Whether the optional signed iPhone Shortcut ships at launch

## Accounts and cloud resources

- [ ] Vercel project with `web` selected as the Root Directory
- [ ] Neon Postgres project and pooled `DATABASE_URL`
- [ ] Google Cloud development and production projects
- [ ] Drive API, Sheets API, and Cloud KMS API enabled
- [ ] External OAuth consent screen configured with the production domain
- [ ] Web OAuth client with the production and localhost callback URLs
- [ ] Symmetric KMS key with automatic rotation
- [ ] KMS service account limited to encrypt/decrypt on that key
- [ ] Test Anthropic workspace key with a low spending limit

## Google OAuth values

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CLOUD_KMS_KEY_NAME`
- `GOOGLE_CLOUD_CREDENTIALS_JSON`

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://YOUR_DOMAIN/api/auth/callback/google`

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://YOUR_DOMAIN`

Only request `openid`, `email`, `profile`, and
`https://www.googleapis.com/auth/drive.file`.

## Values the implementation owner can generate

- `BETTER_AUTH_SECRET`
- `SHORTCUT_TOKEN_PEPPER`
- `BETTER_AUTH_URL`, once the domain is known
- `DATA_BACKUP_RETENTION_DAYS`, once the Neon policy is known

## Physical-device acceptance test

- [ ] Google sign-in completes on iPhone Safari and Android Chrome
- [ ] Take photo opens the rear camera
- [ ] Photo library accepts an existing image
- [ ] Portrait and landscape receipts preview with the correct orientation
- [ ] A large phone photo is compressed and processed successfully
- [ ] Receipt review is usable without horizontal scrolling
- [ ] Add to Home Screen launches directly into the scan workflow
- [ ] Camera, Drive, Anthropic-key replacement, and account deletion errors are understandable
