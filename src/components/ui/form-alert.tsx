import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline banner for form-level errors or confirmations. */
export function FormAlert({
  message,
  tone = "danger",
  className,
}: {
  message?: string | null;
  tone?: "danger" | "success" | "info";
  className?: string;
}) {
  if (!message) return null;
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex animate-fade-up items-start gap-2.5 rounded-xl border px-4 py-3 text-[13.5px] leading-snug",
        tone === "danger" && "border-danger/25 bg-danger-soft text-danger",
        tone === "success" && "border-success/25 bg-success-soft text-success",
        tone === "info" && "border-accent/20 bg-accent-soft text-ink",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Props that wire an input to its <Field> error text for screen readers. */
export function describe(id: string, error?: string) {
  return {
    id,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}
