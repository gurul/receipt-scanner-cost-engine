import { describe, expect, it } from "vitest";
import { GOOGLE_OAUTH_SCOPES } from "./scopes";

describe("Google OAuth scope boundary", () => {
  it("requests only identity and per-file Drive access", () => {
    expect(GOOGLE_OAUTH_SCOPES).toEqual([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.file",
    ]);
  });

  it("never requests broad Drive, Sheets, or Gmail access", () => {
    expect(GOOGLE_OAUTH_SCOPES.join(" ")).not.toMatch(
      /auth\/(drive$|spreadsheets|gmail)/,
    );
  });
});
