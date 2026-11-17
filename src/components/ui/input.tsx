"use client";

import * as React from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const fieldControl = cn(
  "w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink md:text-[15px]",
  "shadow-[inset_0_1px_1px_rgb(var(--shadow-color)/0.03)] transition-[border-color,box-shadow,background-color] duration-200",
  "placeholder:text-faint hover:border-line-strong",
  "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/15",
  "disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-surface-2",
);

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(fieldControl, "h-11", className)} {...props} />;
}

export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(fieldControl, "h-11 pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function SearchInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input type="search" className={cn(fieldControl, "h-11 pl-10", className)} {...props} />
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldControl, "min-h-28 resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(fieldControl, "h-11 appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
