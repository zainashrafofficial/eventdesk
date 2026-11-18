"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuroraGlow, FadeUp, SPRING_SNAPPY, SpringPress, WordReveal } from "./motion-primitives";

function GeminiGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <defs>
        <linearGradient id="hero-gemini" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4285f4" />
          <stop offset="1" stopColor="#9b72cb" />
        </linearGradient>
      </defs>
      <path d="M8 0c.5 4.3 3.7 7.5 8 8-4.3.5-7.5 3.7-8 8-.5-4.3-3.7-7.5-8-8 4.3-.5 7.5-3.7 8-8Z" fill="url(#hero-gemini)" />
    </svg>
  );
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? "/dashboard" : "/signup";
  return (
    <div className="relative">
      <AuroraGlow />
      <div className="container-page relative flex flex-col items-center pb-14 pt-16 text-center sm:pt-24 md:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...SPRING_SNAPPY, delay: 0.05 }}
        >
          <Link
            href={primaryHref}
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1.5 pr-3 text-[13px] font-medium text-ink-2 shadow-soft backdrop-blur transition-colors hover:border-line-strong"
          >
            <span className="grid size-6 place-items-center rounded-full bg-paper ring-1 ring-line">
              <GeminiGlyph />
            </span>
            Powered by Google Gemini
            <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <WordReveal
          lines={["Write it once.", "Post it perfectly."]}
          accent={["perfectly."]}
          className="display mt-7 max-w-4xl text-[2.9rem] sm:text-[4.5rem] lg:text-[5.75rem]"
        />

        <FadeUp delay={0.55}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted sm:text-[19px]">
            Cadence turns a single sentence into scroll-stopping captions, schedules them for the right moment, and keeps
            every draft safe in Google Drive.
          </p>
        </FadeUp>

        <FadeUp delay={0.7} className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <SpringPress>
            <Button asChild size="lg" variant="primary" className="w-full px-8 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)]">
              <Link href={primaryHref}>
                {signedIn ? "Open Studio" : "Get started free"} <ArrowRight />
              </Link>
            </Button>
          </SpringPress>
          <SpringPress>
            <Button asChild size="lg" variant="secondary" className="w-full px-8">
              {signedIn ? <a href="#demo">See it in action</a> : <Link href="/login">Sign in</Link>}
            </Button>
          </SpringPress>
        </FadeUp>
        <FadeUp delay={0.82}>
          <p className="mt-4 text-xs text-faint">Free to use · No card required</p>
        </FadeUp>
      </div>
    </div>
  );
}
