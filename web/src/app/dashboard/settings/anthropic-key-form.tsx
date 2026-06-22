"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";

export function AnthropicKeyForm({ status, fingerprint }: { status: string; fingerprint: string | null }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const valid = status === "valid";

  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/credentials/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not save the key");
      setBusy(false);
      return;
    }
    setApiKey("");
    setMessage("Key verified and saved.");
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Permanently delete the encrypted Anthropic credential from your Drive?")) return;
    setBusy(true);
    const response = await fetch("/api/credentials/anthropic", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setMessage("Could not delete the key.");
      return;
    }
    setMessage("Credential deleted.");
    router.refresh();
  }

  return (
    <div className="mt-5">
      {valid && <div className="mb-4 flex items-center gap-2 rounded-lg bg-moss-soft px-3 py-2 text-sm font-semibold text-moss"><CheckCircle2 size={16} /> Connected · fingerprint {fingerprint}</div>}
      <label><span className="field-label">{valid ? "Replace API key" : "Anthropic API key"}</span><input type="password" autoComplete="off" spellCheck={false} className="field font-mono" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-ant-..." /></label>
      <p className="mt-2 text-xs leading-5 text-ink-faint">The key is verified before saving and is never shown again.</p>
      {message && <p role="status" className={`mt-3 text-sm font-medium ${message.includes("verified") || message.includes("deleted") ? "text-moss" : "text-rust"}`}>{message}</p>}
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy || apiKey.length < 20} onClick={save} className="button-primary">{busy ? "Working..." : valid ? "Replace key" : "Verify and save"}</button>{valid && <button type="button" disabled={busy} onClick={remove} className="button-secondary text-rust"><Trash2 size={15} /> Delete key</button>}</div>
    </div>
  );
}
