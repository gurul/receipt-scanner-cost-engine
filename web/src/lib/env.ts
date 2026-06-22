import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLOUD_KMS_KEY_NAME: z.string().min(1),
  GOOGLE_CLOUD_CREDENTIALS_JSON: z.string().min(1),
  SHORTCUT_TOKEN_PEPPER: z.string().min(32),
  DATA_BACKUP_RETENTION_DAYS: z.coerce.number().int().min(1).max(30),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cached) cached = serverEnvSchema.parse(process.env);
  return cached;
}

export function clearEnvCacheForTests(): void {
  cached = undefined;
}
