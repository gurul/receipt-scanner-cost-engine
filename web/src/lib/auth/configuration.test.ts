import { describe, expect, it } from "vitest";
import {
  authConfigurationMessage,
  getMissingAuthEnvironment,
} from "./configuration";

const completeEnvironment = {
  DATABASE_URL: "postgresql://example",
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_CLOUD_KMS_KEY_NAME: "kms-key",
  GOOGLE_CLOUD_CREDENTIALS_JSON: "{}",
  SHORTCUT_TOKEN_PEPPER: "pepper",
  DATA_BACKUP_RETENTION_DAYS: "7",
};

describe("Google auth configuration", () => {
  it("identifies missing and blank values", () => {
    expect(getMissingAuthEnvironment({
      ...completeEnvironment,
      DATABASE_URL: "",
      GOOGLE_CLIENT_SECRET: "   ",
    })).toEqual(["DATABASE_URL", "GOOGLE_CLIENT_SECRET"]);
  });

  it("accepts a complete environment", () => {
    expect(getMissingAuthEnvironment(completeEnvironment)).toEqual([]);
  });

  it("does not disclose configuration details in production", () => {
    expect(authConfigurationMessage(["DATABASE_URL"], false)).not.toContain(
      "DATABASE_URL",
    );
  });
});
