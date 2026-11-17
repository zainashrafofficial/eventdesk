import Link from "next/link";
import { ArrowRight, CalendarPlus, CloudSun, Database, FolderLock, MapPin, ShieldCheck, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { getCurrentUser } from "@/lib/auth/dal";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Secure accounts",
    body: "Email sign-up and sign-in, cookie sessions, sign-out, and protected pages, actions and API routes.",
  },
  {
    icon: Database,
    title: "Your own records",
    body: "Create, view, edit and delete events in Postgres. Row Level Security keeps every row private to its owner.",
  },
  {
    icon: FolderLock,
    title: "Cloud file storage",
    body: "Upload cover images and documents to a private bucket, served back through expiring signed links.",
  },
  {
    icon: CloudSun,
    title: "Live weather + maps",
    body: "Search any city, then see the venue on a map with current conditions and the forecast for event day.",
  },
];

const STEPS = [
  { n: "01", title: "Create an account", body: "Sign up with your email. Your session stays secure in an HTTP-only cookie." },
  { n: "02", title: "Add an event", body: "Title, date, category, venue (searched live) and an optional cover image." },
  { n: "03", title: "Attach files", body: "Agendas, tickets, posters: images, PDFs and documents up to 10 MB." },
  { n: "04", title: "Check the forecast", body: "Each event shows a 16-day outlook and highlights the day it happens." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/signup";

  return (
    <>
      {/* Hero */}
      <section className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <Badge tone="accent" dot>
            Full-stack event planner
          </Badge>
          <h1 className="display mt-6 text-[clamp(3rem,7vw,5.4rem)] text-ink">
            Plan every event with the <span className="marker">forecast</span> in view.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Keep your events, files and venues in one private workspace, and know what the weather will do before your
            guests ask.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={primaryHref}>
                {user ? "Open your dashboard" : "Start planning, it's free"} <ArrowRight />
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">I have an account</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Product preview card */}
        <div className="animate-fade-up rounded-3xl border border-line bg-surface p-5 shadow-lift [animation-delay:120ms] md:p-6">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Next up</span>
            <Badge tone="accent">Confirmed</Badge>
          </div>
          <h2 className="serif mt-4 text-3xl text-ink">Founders Meetup</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <MapPin className="size-4" /> Lahore, Punjab, Pakistan
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <CalendarPlus className="size-4" /> Sat, 22 Nov · 6:00 PM
          </p>
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
            <Sun className="size-10 text-warning" />
            <div>
              <p className="serif text-3xl leading-none text-ink">24°</p>
              <p className="mt-1 text-sm text-muted">Clear sky on event day · 0% rain</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs text-muted">
            {["Thu", "Fri", "Sat", "Sun", "Mon"].map((d, i) => (
              <div key={d} className={i === 2 ? "rounded-xl bg-ink py-2 text-paper" : "rounded-xl bg-surface-2 py-2"}>
                <p>{d}</p>
                <p className="mt-1 font-medium">{[22, 23, 24, 21, 20][i]}°</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-line bg-surface">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow">What's inside</span>
          <h2 className="display mt-3 max-w-2xl text-[clamp(2.2rem,4.5vw,3.2rem)] text-ink">
            Four building blocks, wired together end to end.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-line bg-paper p-6">
                <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16 md:py-24">
        <span className="eyebrow">How it works</span>
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t border-ink pt-5">
              <span className="font-mono text-xs text-muted">{s.n}</span>
              <h3 className="serif mt-2 text-2xl text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-8 text-paper md:flex-row md:items-center md:p-12">
          <h2 className="display max-w-xl text-[clamp(2rem,4vw,2.8rem)] text-paper">Your next event deserves a plan.</h2>
          <Button asChild size="lg" variant="accent">
            <Link href={primaryHref}>
              {user ? "Go to dashboard" : "Create free account"} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
