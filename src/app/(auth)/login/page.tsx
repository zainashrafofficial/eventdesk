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
      <div className="mb-8">
        <span className="eyebrow">Welcome back</span>
        <h1 className="display mt-3 text-[2.75rem] text-ink">Sign in</h1>
        <p className="mt-2 text-[15px] text-muted">Pick up where you left off with your events.</p>
      </div>
      <LoginForm next={sp.next ? safeNext(sp.next) : undefined} linkError={sp.error} signedOut={sp.signedOut === "1"} />
    </>
  );
}
