import { auth } from "./server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
  }
}

export async function requireGoogleContext(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) throw new AuthenticationRequiredError();

  const token = await auth.api.getAccessToken({
    headers: requestHeaders,
    body: { providerId: "google" },
  });
  if (!token.accessToken) throw new Error("Google Drive authorization is unavailable");
  return { session, accessToken: token.accessToken };
}
