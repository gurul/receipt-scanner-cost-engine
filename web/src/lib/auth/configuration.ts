const AUTH_ENV_KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CLOUD_KMS_KEY_NAME",
  "GOOGLE_CLOUD_CREDENTIALS_JSON",
  "SHORTCUT_TOKEN_PEPPER",
  "DATA_BACKUP_RETENTION_DAYS",
] as const;

export type AuthEnvironment = Record<string, string | undefined>;

export function getMissingAuthEnvironment(
  environment: AuthEnvironment = process.env,
): string[] {
  return AUTH_ENV_KEYS.filter((key) => !environment[key]?.trim());
}

export function authConfigurationMessage(
  missing: string[],
  development = process.env.NODE_ENV !== "production",
): string {
  if (!development) {
    return "Google sign-in is temporarily unavailable. Please try again later.";
  }

  return [
    "Google sign-in is not configured for this local app.",
    `Set ${missing.join(", ")} in web/.env.local, then restart the dev server.`,
  ].join(" ");
}
