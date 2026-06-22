# Operations and recovery

## Release checklist

1. Run tests, lint, type-check, and production build.
2. Review generated SQL and apply migrations before new application code receives traffic.
3. Verify the OAuth scope allowlist did not change.
4. Test OAuth with a non-admin Google account.
5. Complete a test scan using a low-limit Anthropic workspace key.
6. Verify raw receipt and JSON files exist in Drive and do not exist in Neon.
7. Revoke a Shortcut and confirm its next request receives HTTP 401.
8. Test account deletion both with and without Drive-file deletion.

## Logs

Log request/job IDs, status transitions, provider error classes, timings, and HTTP status. Never log request bodies, provider response bodies, filenames containing merchant names, API keys, OAuth tokens, or extracted receipt values.

## Credential failures

Anthropic HTTP 401 marks the workspace `needs_anthropic_key`, preserves the Drive image/draft, and sends the user to Settings. There is no shared fallback key. Google refresh failure requires reauthentication.

## KMS rotation

1. Rotate the symmetric KMS key so a new version becomes primary.
2. Confirm new credentials use the new version.
3. Re-encrypt active OAuth fields and Anthropic Drive vaults in a controlled batch.
4. Audit that active ciphertext no longer references the previous version.
5. Wait beyond the configured Neon point-in-time recovery window.
6. Disable the prior version and test recovery before scheduling destruction.

Never destroy a KMS version merely because it is no longer primary.

## Account deletion and backups

The live deletion path removes the encrypted Anthropic vault, revokes Google authorization, deletes sessions, OAuth rows, workspace metadata, scan jobs, and Shortcut hashes. The user chooses whether the app-created Drive folder is preserved.

Historical encrypted database state may remain in Neon point-in-time recovery for the configured retention window. Publish the exact window in the privacy policy. A restored database must be isolated first and reconciled against an account-deletion audit stored outside the primary Neon branch before traffic is switched to it. Revoked Google grants remain invalid after a restore. The application does not claim that Neon backup snapshots are erased before the configured retention window expires.

## Restore procedure

1. Restore Neon into a new isolated branch.
2. Keep all application traffic on the existing branch.
3. Apply migrations and reconcile accounts against the operator's external account-deletion audit. A restore from before a deletion can recreate old account metadata.
4. Confirm revoked accounts and Shortcut credentials remain unusable.
5. Verify KMS versions required by remaining ciphertext are enabled.
6. Run smoke tests with test accounts only.
7. Switch traffic after an operator review.
