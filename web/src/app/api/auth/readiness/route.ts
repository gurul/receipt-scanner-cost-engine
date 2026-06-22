import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verification } from "@/lib/db/auth-schema";
import {
  authConfigurationMessage,
  getMissingAuthEnvironment,
} from "@/lib/auth/configuration";

export async function GET() {
  const missing = getMissingAuthEnvironment();
  if (missing.length > 0) {
    return NextResponse.json(
      { ready: false, error: authConfigurationMessage(missing) },
      { status: 503 },
    );
  }

  try {
    await db.select({ id: verification.id }).from(verification).limit(1);
    return NextResponse.json({ ready: true });
  } catch (error) {
    console.error("Google auth readiness check failed", error);
    const message = process.env.NODE_ENV === "production"
      ? "Google sign-in is temporarily unavailable. Please try again later."
      : "Google sign-in cannot reach its database. Check DATABASE_URL, run npm run db:migrate, and restart the dev server.";
    return NextResponse.json({ ready: false, error: message }, { status: 503 });
  }
}
