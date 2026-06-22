"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Plus, Smartphone, Trash2 } from "lucide-react";

type TokenRecord = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function ShortcutManager() {
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [label, setLabel] = useState("My iPhone");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/shortcut-tokens").then((response) => response.json()).then((result) => setTokens(result.tokens ?? []));
  }, []);

  async function create() {
    setBusy(true);
    const response = await fetch("/api/shortcut-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return;
    setNewToken(result.token);
    setTokens([{ id: result.id, label: result.label, createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null }, ...tokens]);
  }

  async function revoke(id: string) {
    await fetch(`/api/shortcut-tokens/${id}`, { method: "DELETE" });
    setTokens(tokens.map((token) => token.id === id ? { ...token, revokedAt: new Date().toISOString() } : token));
  }

  return (
    <div className="mt-5">
      <div className="rounded-xl bg-sand/55 p-4 text-sm leading-6 text-ink-muted"><Smartphone size={17} className="mr-2 inline text-moss" />Each device receives a separate revocable token. The token can only submit receipts, is limited to 5 scans per minute and 100 per day, and never contains Google or Anthropic credentials.</div>
      <div className="mt-4 flex gap-2"><input className="field" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="My iPhone" /><button type="button" disabled={busy || !label.trim()} onClick={create} className="button-primary shrink-0"><Plus size={16} /> Create token</button></div>
      {newToken && <div className="mt-4 rounded-xl border border-moss/20 bg-moss-soft/45 p-4"><p className="text-sm font-semibold text-moss">Copy this token now. It will not be shown again.</p><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs">{newToken}</code><button type="button" aria-label="Copy token" className="button-secondary" onClick={async () => { await navigator.clipboard.writeText(newToken); setCopied(true); }} >{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><p className="mt-3 text-xs leading-5 text-ink-muted">Use it as a Bearer token when your Shortcut posts a resized JPEG to <code>/api/shortcut/scan</code>. A signed one-tap template is prepared during deployment.</p></div>}
      <div className="mt-5 divide-y divide-ink/7">{tokens.map((token) => <div key={token.id} className="flex items-center gap-3 py-3"><div className="grid size-9 place-items-center rounded-lg bg-sand text-ink-muted"><Link2 size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{token.label}</p><p className="mt-1 text-xs text-ink-faint">{token.revokedAt ? "Revoked" : token.lastUsedAt ? `Last used ${new Date(token.lastUsedAt).toLocaleDateString()}` : "Never used"}</p></div>{!token.revokedAt && <button type="button" aria-label={`Revoke ${token.label}`} className="text-ink-faint hover:text-rust" onClick={() => revoke(token.id)}><Trash2 size={16} /></button>}</div>)}</div>
    </div>
  );
}
