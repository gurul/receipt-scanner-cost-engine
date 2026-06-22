import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getWorkspace } from "@/lib/workspace/repository";
import { OnboardingWizard } from "./wizard";

export const metadata = { title: "Business setup" };

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const workspace = await getWorkspace(session.user.id);

  if (workspace) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm font-semibold text-moss">Workspace already created</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.04em]">Your setup lives in Google Drive.</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-ink-muted">To avoid creating duplicate workbooks, provisioning only runs once. Connection and credential controls are available in Settings.</p>
        <Link href="/dashboard/settings" className="button-primary mt-7">Open settings</Link>
      </div>
    );
  }

  return <OnboardingWizard />;
}
