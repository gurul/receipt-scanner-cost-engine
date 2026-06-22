import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  authConfigurationMessage,
  getMissingAuthEnvironment,
} from "@/lib/auth/configuration";

const handlers = toNextJsHandler(auth);

async function guardedAuthRequest(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  const missing = getMissingAuthEnvironment();
  if (missing.length > 0) {
    return NextResponse.json(
      { code: "AUTH_NOT_CONFIGURED", message: authConfigurationMessage(missing) },
      { status: 503 },
    );
  }

  try {
    return await handler(request);
  } catch (error) {
    console.error("Google auth request failed", error);
    return NextResponse.json(
      {
        code: "AUTH_UNAVAILABLE",
        message: process.env.NODE_ENV === "production"
          ? "Google sign-in is temporarily unavailable. Please try again later."
          : "Google sign-in failed on the server. Check DATABASE_URL, apply migrations, and verify the Google OAuth callback URL.",
      },
      { status: 503 },
    );
  }
}

export function GET(request: Request): Promise<Response> {
  return guardedAuthRequest(request, handlers.GET);
}

export function POST(request: Request): Promise<Response> {
  return guardedAuthRequest(request, handlers.POST);
}
