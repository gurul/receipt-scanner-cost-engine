import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { googleKmsCipher } from "@/lib/security/kms";
import { withKmsEncryptedOAuthTokens } from "@/lib/security/encrypted-auth-adapter";
import { GOOGLE_OAUTH_SCOPES } from "./scopes";

const database = withKmsEncryptedOAuthTokens(
  drizzleAdapter(db, { provider: "pg", schema }),
  googleKmsCipher,
);

export const auth = betterAuth({
  appName: "ShapersAI Cost Engine",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database,
  emailAndPassword: { enabled: false },
  account: {
    // Encryption is performed by the KMS-aware adapter above.
    encryptOAuthTokens: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "missing-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "missing-google-client-secret",
      scope: [...GOOGLE_OAUTH_SCOPES],
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
    disableOriginCheck: false,
  },
});
