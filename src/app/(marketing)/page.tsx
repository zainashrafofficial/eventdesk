import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoGrid } from "@/components/marketing/bento";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Reveal, SpringPress } from "@/components/marketing/motion-primitives";
import { ProductDemo } from "@/components/marketing/product-demo";
import { credits } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/dal";

const STACK = [
  { name: "Next.js 16", role: "App Router" },
  { name: "Supabase", role: "Auth · Postgres · RLS" },
  { name: "Google Gemini", role: "Captions" },
  { name: "Google Drive", role: "Draft sync" },
  { name: "Resend", role: "Email" },
  { name: "Vercel", role: "Hosting" },
];

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="eyebrow !text-accent">{eyebrow}</span>
      <h2 className="display mt-3 text-[2.25rem] text-ink sm:text-[3.25rem]">{title}</h2>
      {body && <p className="mt-4 text-[17px] leading-relaxed text-muted">{body}</p>}
    </Reveal>
  );
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);
  const primaryHref = signedIn ? "/dashboard" : "/signup";

  return (
    <>
      <section className="relative overflow-hidden">
        <Hero signedIn={signedIn} />
        <div id="demo" className="container-page relative scroll-mt-20 pb-24 md:pb-32">
          <Reveal y={40} delay={0.2}>
            <ProductDemo />
          </Reveal>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-t border-line bg-surface-2/50 py-24 md:py-32">
        <div className="container-page">
          <SectionHead
            eyebrow="Everything in one place"
            title="From idea to inbox reminder."
            body="Quiet, capable tools that work together, so posting consistently stops feeling like a chore."
          />
          <div className="mt-14 md:mt-16">
            <BentoGrid />
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-24 md:py-32">
        <div className="container-page">
          <SectionHead eyebrow="How it works" title="Three steps. About a minute." />
          <HowItWorks />
        </div>
      </section>

      <section aria-labelledby="stack-title" className="border-y border-line bg-surface py-12">
        <div className="container-page">
          <Reveal>
            <p id="stack-title" className="eyebrow text-center">
              Built on a modern, production-grade stack
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              {STACK.map((s) => (
                <li
                  key={s.name}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-[14px] font-semibold tracking-[-0.015em] text-ink"
                >
                  {s.name}
                  <span className="text-[12px] font-medium text-faint">{s.role}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section id="credits" aria-labelledby="credits-title" className="scroll-mt-20 py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-line bg-surface p-8 shadow-soft sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
              />
              <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-end">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent">
                    <GraduationCap className="size-3.5" /> Credits
                  </span>
                  <h2 id="credits-title" className="display mt-5 text-[2rem] text-ink sm:text-[2.75rem]">
                    Built for {credits.event}
                  </h2>
                  <p className="mt-2 text-[17px] text-muted">{credits.track}</p>
                </div>
                <dl className="grid gap-5 text-[14.5px]">
                  <div>
                    <dt className="eyebrow">Department</dt>
                    <dd className="mt-1 font-medium text-ink">{credits.department}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">University</dt>
                    <dd className="mt-1 font-medium text-ink">
                      {credits.university}, {credits.campus}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Designed &amp; developed by</dt>
                    <dd className="mt-1 text-[19px] font-semibold tracking-[-0.02em] text-ink">{credits.developer}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-page">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] border border-line bg-surface px-6 py-16 text-center shadow-soft sm:px-12 md:py-20">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]"
              />
              <h2 className="display relative mx-auto max-w-2xl text-[2.25rem] text-ink sm:text-[3rem]">
                Your next post is one sentence away.
              </h2>
              <p className="relative mx-auto mt-4 max-w-md text-[17px] text-muted">
                Sign up in seconds and write your first caption today.
              </p>
              <div className="relative mt-8 flex justify-center">
                <SpringPress>
                  <Button asChild size="lg" className="px-8">
                    <Link href={primaryHref}>
                      {signedIn ? "Open Studio" : "Start writing"} <ArrowRight />
                    </Link>
                  </Button>
                </SpringPress>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
