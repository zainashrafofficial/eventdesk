import { CloudSun, FolderLock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";

const POINTS = [
  { icon: ShieldCheck, text: "Your events are private to your account, enforced in the database." },
  { icon: FolderLock, text: "Files live in a private bucket and open through expiring links." },
  { icon: CloudSun, text: "Every venue gets a live forecast and a map." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="[&_a]:text-paper">
          <Logo />
        </div>
        <div className="max-w-md">
          <p className="display text-[3.4rem] text-paper">
            Plan it.
            <br />
            Attach it.
            <br />
            <em className="text-[color:var(--marker)]">Check the sky.</em>
          </p>
          <ul className="mt-10 flex flex-col gap-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[15px] leading-relaxed text-paper/75">
                <Icon className="mt-1 size-4 shrink-0 text-paper" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="eyebrow !text-paper/50">Next.js · Supabase · Open-Meteo</p>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/40 blur-3xl" />
      </aside>

      <main id="main" className="flex min-h-dvh flex-col px-5 py-6 md:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:invisible">
            <Logo />
          </div>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </main>
    </div>
  );
}
