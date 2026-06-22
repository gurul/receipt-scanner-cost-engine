import Link from "next/link";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Camera, CheckCircle2, CircleAlert, ExternalLink, KeyRound } from "lucide-react";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { scanJob } from "@/lib/db/schema";
import { getWorkspace } from "@/lib/workspace/repository";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const workspace = await getWorkspace(session.user.id);
  const recent = await db.select().from(scanJob).where(eq(scanJob.userId, session.user.id)).orderBy(desc(scanJob.createdAt)).limit(6);
  const completed = recent.filter((job) => job.status === "completed").length;
  const needsReview = recent.filter((job) => job.status === "awaiting_review").length;

  if (!workspace) {
    return (
      <EmptyState
        icon={SlidersIcon}
        eyebrow="Welcome to ShapersAI"
        title="Let’s build your cost engine."
        text="Choose a business template and we’ll create your private Drive folder and cost workbook. Setup takes a few minutes."
        href="/dashboard/onboarding"
        action="Start business setup"
      />
    );
  }

  if (workspace.status === "needs_anthropic_key") {
    return (
      <EmptyState
        icon={KeyRound}
        eyebrow="One step left"
        title="Connect your Anthropic key."
        text="Your Drive workspace is ready. Add your own Anthropic key to turn receipt photos into structured purchase data."
        href="/dashboard/settings"
        action="Add Anthropic key"
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-moss">Good to see you, {session.user.name?.split(" ")[0]}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.045em]">Your cost pulse</h1>
          <p className="mt-2 text-ink-muted">Recent processing activity and the health of your workspace.</p>
        </div>
        <Link href="/dashboard/scan" className="button-primary"><Camera size={17} /> Scan a receipt</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Summary label="Recent scans" value={String(recent.length)} detail="Last six jobs" />
        <Summary label="Completed" value={String(completed)} detail="Written to Sheets" positive />
        <Summary label="Needs review" value={String(needsReview)} detail="Waiting for confirmation" attention={needsReview > 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
            <div><h2 className="font-semibold">Processing activity</h2><p className="mt-1 text-sm text-ink-faint">No receipt contents are stored here.</p></div>
          </div>
          {recent.length ? (
            <div className="divide-y divide-ink/7">
              {recent.map((job) => <JobRow key={job.id} job={job} />)}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-ink-muted">Your first receipt will appear here.</div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="panel p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-moss-soft text-moss"><CheckCircle2 size={20} /></div>
            <h2 className="mt-5 font-semibold">Workspace connected</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Drive, Sheets, and your personal Anthropic credential are ready.</p>
            {workspace.spreadsheetId && <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-moss" href={`https://docs.google.com/spreadsheets/d/${workspace.spreadsheetId}/edit`} target="_blank" rel="noreferrer">Open workbook <ExternalLink size={14} /></a>}
          </div>
          <Link href="/dashboard/settings" className="group flex items-center justify-between rounded-xl border border-ink/9 bg-white px-5 py-4 text-sm font-semibold">Manage connections <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
        </aside>
      </div>
    </div>
  );
}

function SlidersIcon() { return <div className="font-display text-2xl font-bold">01</div>; }

function EmptyState({ icon: Icon, eyebrow, title, text, href, action }: { icon: React.ComponentType; eyebrow: string; title: string; text: string; href: string; action: string }) {
  return <div className="mx-auto max-w-2xl py-16 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-moss-soft text-moss"><Icon /></div><p className="mt-7 text-sm font-semibold text-moss">{eyebrow}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.05em]">{title}</h1><p className="mx-auto mt-5 max-w-lg leading-7 text-ink-muted">{text}</p><Link href={href} className="button-primary mt-8">{action}<ArrowRight size={17} /></Link></div>;
}

function Summary({ label, value, detail, positive, attention }: { label: string; value: string; detail: string; positive?: boolean; attention?: boolean }) {
  return <div className="panel p-5"><p className="text-sm text-ink-faint">{label}</p><div className="mt-3 flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight">{value}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attention ? "bg-orange-100 text-rust" : positive ? "bg-moss-soft text-moss" : "bg-sand text-ink-muted"}`}>{detail}</span></div></div>;
}

function JobRow({ job }: { job: typeof scanJob.$inferSelect }) {
  const failed = job.status === "failed";
  const review = job.status === "awaiting_review";
  const content = <><div className={`grid size-9 place-items-center rounded-full ${failed ? "bg-red-50 text-rust" : review ? "bg-orange-50 text-orange-700" : "bg-moss-soft text-moss"}`}>{failed || review ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold capitalize">{job.status.replaceAll("_", " ")}</p><p className="mt-1 truncate text-xs text-ink-faint">{job.source} · {job.createdAt.toLocaleString()}</p></div><span className="font-mono text-[11px] text-ink-faint">{job.id.slice(0, 8)}</span></>;
  return review ? <Link href={`/dashboard/scan?jobId=${job.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-orange-50/40">{content}</Link> : <div className="flex items-center gap-4 px-5 py-4">{content}</div>;
}
