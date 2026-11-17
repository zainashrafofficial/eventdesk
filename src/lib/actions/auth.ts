"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { absoluteUrl, safeNext } from "@/lib/utils";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/actions/types";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

/** Authentication: sign up, sign in, sign out (Supabase Auth, cookie-based sessions). */

const NOT_CONFIGURED = "Authentication isn't configured yet. Add your Supabase keys to .env.local.";

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Confirm your email first. We sent you a link when you signed up.");
    }
    if (error.status === 429) return fail("Too many attempts. Wait a minute and try again.");
    // Same message for wrong email or wrong password: never reveal which accounts exist.
    return fail("That email and password don't match an account.");
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export type SignUpResult = ActionResult<{ needsConfirmation: boolean; email: string }>;

export async function signUp(_prev: SignUpResult | null, formData: FormData): Promise<SignUpResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);

  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", zodFieldErrors(parsed.error));

  const { full_name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: absoluteUrl("/auth/callback?next=/dashboard"),
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      return fail("An account with that email already exists. Try signing in.", {
        email: "This email is already registered.",
      });
    }
    if (error.code === "weak_password") return fail("Choose a stronger password.", { password: error.message });
    if (error.status === 429) return fail("Too many sign-up attempts. Wait a minute and try again.");
    return fail(error.message || "We couldn't create your account. Please try again.");
  }

  // Email confirmation disabled -> Supabase returns a session and the user is signed in.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard?welcome=1");
  }

  return ok({ needsConfirmation: true, email });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?signedOut=1");
}
