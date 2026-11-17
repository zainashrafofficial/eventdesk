"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { FormAlert, describe } from "@/components/ui/form-alert";
import { signIn, signUp } from "@/lib/actions/auth";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { zodFieldErrors, type ActionResult } from "@/lib/actions/types";
import { omit } from "@/lib/utils";

/**
 * Validates on the client with the same zod schema the server uses, so users
 * see errors instantly; the Server Action validates again before touching Supabase.
 */
function useAuthForm(schema: typeof signInSchema | typeof signUpSchema) {
  // Controlled values: React 19 resets uncontrolled fields after a form action,
  // which would wipe the email after a wrong password.
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // Read every field from the form (untouched fields arrive as "" instead of undefined).
    const result = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!result.success) {
      event.preventDefault();
      const errors = zodFieldErrors(result.error);
      setClientErrors(errors);
      const first = Object.keys(errors)[0];
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    } else {
      setClientErrors({});
    }
  };

  const bind = (name: string) => ({
    name,
    value: values[name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [name]: value }));
      setClientErrors((errors) => omit(errors, name));
    },
  });

  return { clientErrors, onSubmit, bind };
}

function serverErrors(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.fieldErrors ?? {} : {};
}

const LINK_ERRORS: Record<string, string> = {
  link_invalid: "That link has expired or was already used. Sign in with your email and password.",
};

/* --------------------------------- Login ---------------------------------- */

export function LoginForm({ next, linkError, signedOut }: { next?: string; linkError?: string; signedOut?: boolean }) {
  const [state, action, pending] = useActionState(signIn, null);
  const { clientErrors, onSubmit, bind } = useAuthForm(signInSchema);
  const fe = { ...serverErrors(state), ...clientErrors };

  return (
    <div className="flex flex-col gap-6">
      {signedOut && !state && <FormAlert tone="success" message="You've been signed out. See you soon." />}
      <FormAlert message={state && !state.ok ? state.error : linkError ? LINK_ERRORS[linkError] : null} />
      <form action={action} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <Field label="Email" htmlFor="email" error={fe.email}>
          <Input
            {...describe("email", fe.email)}
            {...bind("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" error={fe.password}>
          <PasswordInput
            {...describe("password", fe.password)}
            {...bind("password")}
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
          Sign in <ArrowRight />
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

/* --------------------------------- Sign up -------------------------------- */

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  const { clientErrors, onSubmit, bind } = useAuthForm(signUpSchema);
  const fe = { ...serverErrors(state), ...clientErrors };

  if (state?.ok && state.data?.needsConfirmation) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6">
        <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
          <MailCheck className="size-5" />
        </span>
        <h2 className="serif text-2xl text-ink">Check your inbox</h2>
        <p className="text-sm leading-relaxed text-muted">
          We sent a confirmation link to <strong className="text-ink">{state.data.email}</strong>. Open it to activate your
          account, then sign in.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FormAlert message={state && !state.ok ? state.error : null} />
      <form action={action} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Full name" htmlFor="full_name" error={fe.full_name}>
          <Input
            {...describe("full_name", fe.full_name)}
            {...bind("full_name")}
            autoComplete="name"
            placeholder="Ayesha Khan"
            required
          />
        </Field>
        <Field label="Email" htmlFor="email" error={fe.email}>
          <Input
            {...describe("email", fe.email)}
            {...bind("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters, with a letter and a number.">
          <PasswordInput
            {...describe("password", fe.password)}
            {...bind("password")}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={fe.confirm}>
          <PasswordInput
            {...describe("confirm", fe.confirm)}
            {...bind("confirm")}
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
          Create account <ArrowRight />
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
