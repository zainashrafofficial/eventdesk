/** Standard return shape for Server Actions (used with useActionState / transitions). */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T,>(data?: T, message?: string): ActionResult<T> => ({ ok: true, data, message });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

/** Flatten a zod v4 error into { field: message }. */
export function zodFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
