import Link from "next/link";
import { headers } from "next/headers";
import { ExternalLink, FolderOpen, KeyRound, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { auth } from "@/lib/auth/server";
import { getWorkspace } from "@/lib/workspace/repository";
import { AnthropicKeyForm } from "./anthropic-key-form";
import { ShortcutManager } from "./shortcut-manager";
import { DangerZone } from "./danger-zone";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const workspace = await getWorkspace(session.user.id);
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-4xl">
      <div><p className="text-sm font-semibold text-moss">Connections and ownership</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.045em]">Settings</h1><p className="mt-2 text-ink-muted">Manage the services ShapersAI uses on your behalf.</p></div>

      {!workspace ? (
        <div className="panel mt-8 p-8 text-center"><p className="text-ink-muted">Create your business workspace before adding credentials.</p><Link href="/dashboard/onboarding" className="button-primary mt-5">Start setup</Link></div>
      ) : (
        <div className="mt-8 space-y-5">
          {params.setup === "anthropic" && <div className="rounded-xl border border-moss/20 bg-moss-soft p-4 text-sm font-medium text-moss">Your Drive workspace is ready. Add your Anthropic key to finish setup.</div>}
          <section className="panel p-5 sm:p-7">
            <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-moss-soft text-moss"><KeyRound size={20} /></div><div className="flex-1"><h2 className="text-lg font-semibold">Anthropic API key</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Used only when you scan a receipt. It is encrypted by Google Cloud KMS before being stored in your Drive.</p><AnthropicKeyForm status={workspace.anthropicKeyStatus} fingerprint={workspace.anthropicKeyFingerprint} /></div></div>
          </section>

          <section className="panel p-5 sm:p-7">
            <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand text-ink-muted"><FolderOpen size={20} /></div><div className="flex-1"><h2 className="text-lg font-semibold">Google Drive workspace</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Your durable receipt archive, configuration, and workbook remain in your Google account.</p><div className="mt-5 flex flex-wrap gap-3">{workspace.rootFolderId && <a href={`https://drive.google.com/drive/folders/${workspace.rootFolderId}`} target="_blank" rel="noreferrer" className="button-secondary">Open Drive folder <ExternalLink size={15} /></a>}{workspace.spreadsheetId && <a href={`https://docs.google.com/spreadsheets/d/${workspace.spreadsheetId}/edit`} target="_blank" rel="noreferrer" className="button-secondary">Open workbook <ExternalLink size={15} /></a>}</div></div></div>
          </section>

          <section className="rounded-xl border border-ink/9 bg-white p-5 sm:p-7">
            <div className="flex items-start gap-4"><ShieldCheck className="mt-0.5 text-moss" size={22} /><div><h2 className="font-semibold">Plain-language security boundary</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Stored copies are encrypted, but the server must briefly decrypt your key while calling Anthropic. A compromised running deployment could still expose it. Set an Anthropic spend limit and rotate the key if you suspect misuse.</p></div></div>
          </section>

          <section className="panel p-5 sm:p-7">
            <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand text-ink-muted"><Smartphone size={20} /></div><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">iPhone Shortcut</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Create one token per device and revoke it instantly if a phone or Shortcut is shared.</p><ShortcutManager /></div></div>
          </section>

          <section className="rounded-xl border border-rust/25 bg-white p-5 sm:p-7">
            <div className="flex items-start gap-4"><TriangleAlert className="mt-0.5 shrink-0 text-rust" size={22} /><div className="flex-1"><h2 className="text-lg font-semibold text-rust">Delete account</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Revoke Google access, delete credentials and operational metadata, and choose whether Drive business files survive.</p><DangerZone backupRetentionDays={Number(process.env.DATA_BACKUP_RETENTION_DAYS ?? 7)} /></div></div>
          </section>
        </div>
      )}
    </div>
  );
}
