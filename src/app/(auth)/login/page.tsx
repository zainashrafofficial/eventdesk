import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signedOut?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <div className="mb-8 mt-6 text-center">
        <h1 className="display text-[2.25rem] text-ink sm:text-[2.5rem]">Sign in to Cadence</h1>
        <p className="mt-2 text-[15px] text-muted">Your captions and schedule are right where you left them.</p>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        <LoginForm next={sp.next ? safeNext(sp.next) : undefined} linkError={sp.error} signedOut={sp.signedOut === "1"} />
      </div>
    </>
  );
}
