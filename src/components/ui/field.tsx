import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-ink", className)} {...props} />;
}

type FieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Right-aligned element next to the label (e.g. "Forgot password?") */
  aside?: React.ReactNode;
};

/**
 * Label + control + helper/error text. Give the control `id={htmlFor}` and
 * `aria-describedby={`${htmlFor}-hint ${htmlFor}-error`}` + `aria-invalid={!!error}`.
 */
export function Field({ label, htmlFor, hint, error, required, optional, className, children, aside }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || aside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <Label htmlFor={htmlFor}>
              {label}
              {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
              {optional && <span className="ml-1.5 text-xs font-normal text-muted">Optional</span>}
            </Label>
          )}
          {aside}
        </div>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-[13px] leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="flex items-center gap-1.5 text-[13px] leading-snug text-danger"
        >
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/** Group of fields with a heading, used on settings / editor pages. */
export function FieldSet({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid gap-6 border-t border-line pt-8 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10", className)}>
      <div>
        <legend className="text-[15px] font-semibold text-ink">{title}</legend>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </fieldset>
  );
}
