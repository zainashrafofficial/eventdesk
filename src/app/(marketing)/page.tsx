import Link from "next/link";
import { ArrowRight, BellRing, CalendarClock, Check, CloudUpload, Mail, PenLine, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    text: "Golden hour, fresh roast, zero rush. Our new Ethiopia single-origin lands Thursday. Come taste the sunrise.",
    tags: ["#specialtycoffee", "#newroast", "#slowmornings"],
    selected: true,
  },
  {
    text: "Notes of blueberry and jasmine in every cup. The Yirgacheffe drop is almost here. Set your alarm.",
    tags: ["#coffeelover", "#singleorigin"],
    selected: false,
  },
  {
    text: "We roasted 40 kilos so you don't have to wait. Thursday, 7 AM, first pour on us.",
    tags: ["#localroasters", "#morningritual"],
    selected: false,
  },
];

const QUEUE = [
  { day: "Thu", time: "6:00 PM", label: "Ethiopia roast launch" },
  { day: "Sat", time: "9:30 AM", label: "Weekend brunch menu" },
  { day: "Mon", time: "8:00 AM", label: "Barista of the month" },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Captions by Gemini",
    body: "Describe the post in a sentence. Get three distinct, on-brand options with hashtags tuned to the platform.",
  },
  {
    icon: CloudUpload,
    title: "Google Drive sync",
    body: "Every draft is saved as a Google Doc in your own Cadence Drafts folder, so you always have a copy.",
  },
  {
    icon: CalendarClock,
    title: "Smart scheduling",
    body: "Pick a time and Cadence keeps your queue in order, from the next post to the drafts you'll finish later.",
  },
  {
    icon: BellRing,
    title: "Email reminders",
    body: "A confirmation when you schedule and a reminder before it goes live. You choose the timing and the details.",
  },
];

const STEPS = [
  { icon: PenLine, title: "Describe it", body: "One line about your post, plus the platform and tone." },
  { icon: Wand2, title: "Pick a caption", body: "Choose from three AI options and polish the words." },
  { icon: CalendarClock, title: "Schedule it", body: "Set the time. Drive and your inbox take it from there." },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-2 shadow-soft [&_svg]:size-3.5">
      {children}
    </span>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 -bottom-10 top-20 rounded-[48px] bg-accent/15 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-lift">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-5 py-3">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 hidden text-xs font-medium text-faint sm:inline">Cadence · Studio</span>
        </div>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <div className="min-w-0">
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">Describe your post</span>
                <span className="text-[11px] font-medium text-faint">Instagram · Warm</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">
                Launching our new Ethiopian single-origin roast this Thursday morning
                <span aria-hidden className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-accent" />
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                    3 options
                  </span>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                    Hashtags
                  </span>
                </div>
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-medium text-accent-ink">
                  <Sparkles className="size-3.5" /> Generate
                </span>
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-2.5">
              {OPTIONS.map((o, i) => (
                <li
                  key={o.text}
                  className={cn(
                    "rounded-2xl border p-4",
                    o.selected ? "border-accent bg-accent-soft/60 ring-4 ring-accent/10" : "border-line bg-surface",
                    i === 2 && "hidden sm:block",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                        o.selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong",
                      )}
                    >
                      {o.selected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-relaxed text-ink">{o.text}</p>
                      <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-accent">
                        {o.tags.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <span className="eyebrow">Schedule</span>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                  <CalendarClock className="size-5" />
                </span>
                <div>
                  <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Thu 6:00 PM</p>
                  <p className="text-xs text-muted">Nov 20 · Instagram</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>
                  <CloudUpload className="text-accent" /> Synced to Google Drive
                </Pill>
                <Pill>
                  <Mail className="text-success" /> Email reminder on
                </Pill>
              </div>
              <span className="mt-5 flex h-10 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-ink">
                Schedule post
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Up next</span>
                <span className="text-[11px] font-medium text-faint">3 scheduled</span>
              </div>
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {QUEUE.map((p) => (
                  <li key={p.label} className="flex items-center gap-3 py-2.5">
                    <span className="w-9 text-xs font-semibold text-ink">{p.day}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{p.label}</span>
                    <span className="tabular text-xs text-muted">{p.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/signup";

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[38rem] w-[60rem] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_20%,transparent),transparent)]"
        />
        <div className="container-page relative flex flex-col items-center pb-16 pt-20 text-center sm:pt-28 md:pb-20">
          <Link
            href={primaryHref}
            className="group inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-[13px] font-medium text-ink-2 shadow-soft backdrop-blur transition-colors hover:border-line-strong"
          >
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">New</span>
            Powered by Google Gemini
            <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1
            className="display text-gradient mt-7 max-w-4xl animate-fade-up pb-2 text-[3rem] sm:text-[4.5rem] lg:text-[5.5rem]"
            style={{ animationDelay: "60ms" }}
          >
            Write it once.
            <br />
            Post it perfectly.
          </h1>
          <p
            className="mt-6 max-w-xl animate-fade-up text-[17px] leading-relaxed text-muted sm:text-[19px]"
            style={{ animationDelay: "120ms" }}
          >
            Cadence turns a single sentence into scroll-stopping captions, schedules them for the right moment, and keeps
            every draft safe in Google Drive.
          </p>
          <div className="mt-9 flex w-full animate-fade-up flex-col justify-center gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "180ms" }}>
            <Button asChild size="lg" variant="primary" className="px-8">
              <Link href={primaryHref}>
                {user ? "Open Studio" : "Get started"} <ArrowRight />
              </Link>
            </Button>
            {!user && (
              <Button asChild size="lg" variant="secondary" className="px-8">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
          <p className="mt-4 animate-fade-up text-xs text-faint" style={{ animationDelay: "220ms" }}>
            Free to use · No card required
          </p>
        </div>

        <div className="container-page relative animate-fade-up pb-24 md:pb-32" style={{ animationDelay: "260ms" }}>
          <ProductPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-t border-line bg-surface py-24 md:py-32">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow !text-accent">Everything in one place</span>
            <h2 className="display mt-3 text-[2.25rem] text-ink sm:text-[3.25rem]">From idea to inbox reminder.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">
              Four quiet, capable tools that work together, so posting consistently stops feeling like a chore.
            </p>
          </div>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-3xl border border-line bg-paper p-7 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-surface text-accent shadow-soft ring-1 ring-line">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-6 text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-24 md:py-32">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow !text-accent">How it works</span>
            <h2 className="display mt-3 text-[2.25rem] text-ink sm:text-[3.25rem]">Three steps. About a minute.</h2>
          </div>
          <ol className="mx-auto mt-16 grid max-w-5xl gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[calc(50%+3rem)] right-[calc(-50%+3rem)] top-7 hidden h-px bg-line-strong md:block"
                  />
                )}
                <span className="relative grid size-14 place-items-center rounded-full bg-surface text-ink shadow-soft ring-1 ring-line">
                  <Icon className="size-5" />
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-ink">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
                <p className="mt-1.5 max-w-60 text-[14px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[32px] border border-line bg-surface px-6 py-16 text-center shadow-soft sm:px-12 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]"
            />
            <h2 className="display relative mx-auto max-w-2xl text-[2.25rem] text-ink sm:text-[3rem]">
              Your next post is one sentence away.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-[17px] text-muted">Sign up in seconds and write your first caption today.</p>
            <div className="relative mt-8 flex justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href={primaryHref}>
                  {user ? "Open Studio" : "Start writing"} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
