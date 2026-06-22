import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BarChart3, Camera, Settings, SlidersHorizontal } from "lucide-react";
import { auth } from "@/lib/auth/server";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/8 bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <Nav href="/dashboard" icon={BarChart3}>Overview</Nav>
            <Nav href="/dashboard/scan" icon={Camera}>Scan receipt</Nav>
            <Nav href="/dashboard/onboarding" icon={SlidersHorizontal}>Business setup</Nav>
            <Nav href="/dashboard/settings" icon={Settings}>Settings</Nav>
          </nav>
          <div className="flex items-center gap-2">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="size-8 rounded-full border border-ink/10" referrerPolicy="no-referrer" />
            ) : <span className="grid size-8 place-items-center rounded-full bg-moss-soft text-sm font-bold text-moss">{session.user.name?.[0] ?? "U"}</span>}
            <div className="hidden sm:block"><SignOutButton /></div>
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-ink/6 px-3 py-2 md:hidden">
          <Nav href="/dashboard" icon={BarChart3}>Overview</Nav>
          <Nav href="/dashboard/scan" icon={Camera}>Scan</Nav>
          <Nav href="/dashboard/onboarding" icon={SlidersHorizontal}>Setup</Nav>
          <Nav href="/dashboard/settings" icon={Settings}>Settings</Nav>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

function Nav({ href, icon: Icon, children }: { href: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return <Link href={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-white hover:text-ink"><Icon size={16} />{children}</Link>;
}
