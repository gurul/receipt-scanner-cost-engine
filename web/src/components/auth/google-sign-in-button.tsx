"use client";

import { useState } from "react";
import { ArrowRight, CircleAlert, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function GoogleSignInButton({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const readinessResponse = await fetch("/api/auth/readiness", {
        cache: "no-store",
      });
      const readiness = await readinessResponse.json() as {
        ready?: boolean;
        error?: string;
      };
      if (!readinessResponse.ok || !readiness.ready) {
        throw new Error(readiness.error || "Google sign-in is unavailable.");
      }

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      if (result.error) {
        throw new Error(result.error.message || "Google sign-in could not start.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Google sign-in could not start. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={signIn}
        className={compact ? "button-compact" : dark ? "button-light" : "button-primary"}
      >
        <GoogleMark />
        {loading ? "Checking sign-in..." : compact ? "Sign in" : "Continue with Google"}
        {!compact && <ArrowRight size={17} />}
      </button>
      {error && (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,42rem)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-rust/20 bg-white p-4 text-left text-sm text-ink shadow-[0_18px_60px_rgba(24,37,31,.22)]"
        >
          <CircleAlert className="mt-0.5 shrink-0 text-rust" size={19} />
          <span className="flex-1 leading-6">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-md p-1 text-ink-faint hover:bg-sand hover:text-ink"
            aria-label="Dismiss sign-in error"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.32 2.98-7.39Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.53c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.29.31-1.88V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.99c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.61C7.18 7.75 9.39 6 12 6Z" />
    </svg>
  );
}
