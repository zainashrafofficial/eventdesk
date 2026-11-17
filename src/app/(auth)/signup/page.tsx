import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <div className="mb-8">
        <span className="eyebrow">Get started free</span>
        <h1 className="display mt-3 text-[2.75rem] text-ink">Create your account</h1>
        <p className="mt-2 text-[15px] text-muted">It takes under a minute. No card, no setup.</p>
      </div>
      <SignupForm />
    </>
  );
}
