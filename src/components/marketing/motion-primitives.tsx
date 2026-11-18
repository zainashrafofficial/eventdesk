"use client";

import { MotionConfig, motion, useInView, type Variants } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 } as const;
export const SPRING_SNAPPY = { type: "spring", stiffness: 420, damping: 28 } as const;

/** App-wide motion defaults: honours the OS "reduce motion" setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}>
      {children}
    </MotionConfig>
  );
}

/** Fades + lifts its children the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}

const wordContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const word: Variants = {
  hidden: { opacity: 0, y: "0.45em", filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE_OUT_EXPO } },
};

/**
 * Word-by-word blur/rise headline. Each line is an array of words; words listed in `accent`
 * get the accent gradient. Screen readers get the plain sentence via aria-label.
 */
export function WordReveal({
  lines,
  accent = [],
  className,
}: {
  lines: string[];
  accent?: string[];
  className?: string;
}) {
  const label = lines.join(" ");
  return (
    <motion.h1 aria-label={label} className={className} variants={wordContainer} initial="hidden" animate="visible">
      {lines.map((line, li) => (
        <span key={line} aria-hidden className="block">
          {line.split(" ").map((w, wi) => (
            <motion.span
              key={`${li}-${wi}-${w}`}
              variants={word}
              className={cn(
                "mr-[0.22em] inline-block pb-[0.08em] will-change-transform last:mr-0",
                accent.includes(w) ? "text-gradient-accent" : "text-gradient",
              )}
            >
              {w}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

/** Spring hover/tap wrapper for pill CTAs (wrap a Button/Link). */
export function SpringPress({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span
      className={cn("inline-flex", className)}
      whileHover={{ scale: 1.035, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_SNAPPY}
    >
      {children}
    </motion.span>
  );
}

/** Staggered fade-up for hero sub-elements after the headline. */
export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Soft animated aurora: two drifting radial blobs (accent + indigo). Pure decoration. */
export function AuroraGlow({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute left-1/2 top-[-16rem] h-[40rem] w-[64rem] max-w-[170vw] -translate-x-1/2 animate-aurora-a rounded-full blur-2xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, var(--accent) ${Math.round(22 * intensity)}%, transparent), transparent)`,
        }}
      />
      <div
        className="absolute left-[58%] top-[-6rem] h-[28rem] w-[40rem] max-w-[120vw] -translate-x-1/2 animate-aurora-b rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, #5e5ce6 ${Math.round(16 * intensity)}%, transparent), transparent)`,
        }}
      />
    </div>
  );
}
