"use client";

import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-sand hover:text-ink"
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}
