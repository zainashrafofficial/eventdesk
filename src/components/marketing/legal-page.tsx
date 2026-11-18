import type { ReactNode } from "react";

/** Shared layout for the Privacy Policy and Terms of Service pages. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-accent">{eyebrow}</p>
        <h1 className="display mt-3 text-[2.5rem] text-ink sm:text-[3.25rem]">{title}</h1>
        <p className="mt-3 text-[14px] text-muted">Last updated {updated}</p>
        <div className="mt-10 flex flex-col gap-8 rounded-3xl border border-line bg-surface p-6 text-[15px] leading-relaxed text-ink-2 shadow-soft sm:p-10 [&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink [&_li]:mt-1.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </article>
  );
}
