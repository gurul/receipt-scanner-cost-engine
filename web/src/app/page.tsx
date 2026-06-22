import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  KeyRound,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Logo } from "@/components/logo";

const features = [
  {
    icon: ScanLine,
    title: "Scan, check, commit",
    text: "Claude extracts every line item. You review uncertain matches before anything reaches your workbook.",
  },
  {
    icon: BarChart3,
    title: "Know the real margin",
    text: "Latest purchase prices, recipes, overhead, and selling prices come together in one cost model.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    text: "Receipts, configuration, and the workbook live in your Google Drive. Your Anthropic key pays only for your use.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-ink">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-muted md:flex">
          <a href="#how-it-works" className="transition hover:text-ink">How it works</a>
          <a href="#ownership" className="transition hover:text-ink">Data ownership</a>
          <Link href="/dashboard" className="transition hover:text-ink">Dashboard</Link>
        </nav>
        <GoogleSignInButton compact />
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-32 lg:pt-20">
        <div className="relative z-10">
          <div className="eyebrow"><span /> Built for independent operators</div>
          <h1 className="mt-7 max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Turn every receipt into a clearer business decision.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-ink-muted">
            ShapersAI watches purchase costs move, recalculates what each product really costs, and shows where your margin is going.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GoogleSignInButton />
            <a href="#how-it-works" className="button-secondary">
              See the workflow <ArrowRight size={17} />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-muted">
            {[
              "No shared AI bill",
              "No broad Drive access",
              "No terminal setup",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check size={15} className="text-moss" /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="hero-orbit" />
          <div className="relative rounded-[2rem] border border-ink/10 bg-white p-4 shadow-[0_28px_90px_rgba(28,42,34,.15)] sm:p-6">
            <div className="flex items-center justify-between border-b border-ink/8 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-ink-faint">Margin snapshot</p>
                <p className="mt-1 text-xl font-semibold">June overview</p>
              </div>
              <span className="rounded-full bg-moss-soft px-3 py-1 text-xs font-semibold text-moss">Workbook synced</span>
            </div>
            <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-3">
              <Metric label="Purchases" value="$8,420" delta="+4.2%" />
              <Metric label="Avg. margin" value="38.6%" delta="-1.4%" negative />
              <Metric label="Items to review" value="7" delta="Action" wide />
            </div>
            <div className="rounded-2xl bg-ink p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.17em] text-white/55">Cost movement</p>
                  <p className="mt-1 font-medium">Top ingredients this month</p>
                </div>
                <BarChart3 className="text-apricot" size={22} />
              </div>
              <div className="mt-6 space-y-4">
                <CostRow name="Ground pork" amount="$3.18/lb" width="82%" change="+12%" />
                <CostRow name="Rice paper" amount="$0.14/ea" width="58%" change="+3%" />
                <CostRow name="Cooking oil" amount="$0.09/oz" width="42%" change="-4%" positive />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-ink/8 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <div className="max-w-2xl">
            <div className="eyebrow"><span /> One calm workflow</div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Less spreadsheet tending. More useful answers.</h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="feature-card">
                <div className="flex items-center justify-between">
                  <div className="grid size-11 place-items-center rounded-xl bg-moss-soft text-moss"><Icon size={21} /></div>
                  <span className="font-mono text-xs text-ink-faint">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-ink-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ownership" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:px-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-sm font-semibold text-apricot"><KeyRound size={18} /> Bring your own Anthropic key</div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-.04em]">Your business data should not become someone else’s database.</h2>
            <p className="mt-5 leading-7 text-white/65">The durable copies stay in your Drive. Disconnect the app and your workbook and receipt archive remain yours.</p>
          </div>
          <div className="mt-8 lg:mt-0"><GoogleSignInButton dark /></div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, delta, negative, wide }: { label: string; value: string; delta: string; negative?: boolean; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-sand p-4 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 text-xs font-medium ${negative ? "text-rust" : "text-moss"}`}>{delta}</p>
    </div>
  );
}

function CostRow({ name, amount, width, change, positive }: { name: string; amount: string; width: string; change: string; positive?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs"><span className="text-white/70">{name}</span><span>{amount} <b className={positive ? "text-emerald-300" : "text-apricot"}>{change}</b></span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-apricot" style={{ width }} /></div>
    </div>
  );
}
