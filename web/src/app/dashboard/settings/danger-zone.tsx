"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DangerZone({ backupRetentionDays }: { backupRetentionDays: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleteDriveFiles, setDeleteDriveFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteDriveFiles }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error ?? "Deletion failed");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-5">
      <label className="flex items-start gap-3 rounded-xl border border-ink/10 p-4 text-sm"><input type="checkbox" checked={deleteDriveFiles} onChange={(event) => setDeleteDriveFiles(event.target.checked)} className="mt-1" /><span><b>Also permanently delete the app-created ShapersAI Drive folder.</b><span className="mt-1 block leading-6 text-ink-muted">Leave this unchecked to keep your receipts, configuration, and workbook after disconnecting.</span></span></label>
      <label className="mt-4 block"><span className="field-label">Type DELETE to confirm</span><input className="field max-w-xs" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
      <p className="mt-3 text-xs leading-5 text-ink-faint">Active records are deleted immediately. Encrypted historical records may remain in Neon point-in-time recovery for up to {backupRetentionDays} days.</p>
      {error && <p className="mt-3 text-sm font-medium text-rust">{error}</p>}
      <button type="button" disabled={busy || confirm !== "DELETE"} onClick={remove} className="mt-4 rounded-lg bg-rust px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Deleting..." : "Delete account"}</button>
    </div>
  );
}
