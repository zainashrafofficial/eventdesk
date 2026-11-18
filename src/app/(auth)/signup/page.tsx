import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";
import { AuthCard } from "@/components/marketing/auth-shell";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <div className="mb-8 mt-6 text-center">
        <h1 className="display text-[2.25rem] text-ink sm:text-[2.5rem]">Create your account</h1>
        <p className="mt-2 text-[15px] text-muted">One account for AI captions, scheduling and reminders. Free, no card.</p>
      </div>
      <AuthCard>
        <SignupForm />
      </AuthCard>
    </>
  );
}
