"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { CalendarClock, PenLine, Wand2 } from "lucide-react";
import { useRef } from "react";
import { EASE_OUT_EXPO } from "./motion-primitives";

const STEPS = [
  { icon: PenLine, title: "Describe it", body: "One line about your post, plus the platform and tone." },
  { icon: Wand2, title: "Pick a caption", body: "Choose from three Gemini options and polish the words." },
  { icon: CalendarClock, title: "Schedule it", body: "Set the time. Drive and your inbox take it from there." },
];

/** Three steps joined by a progress line that draws as you scroll. */
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const scale = useTransform(progress, [0, 1], [0, 1]);

  return (
    <ol ref={ref} className="relative mx-auto mt-16 grid max-w-5xl gap-12 md:grid-cols-3 md:gap-6">
      {/* Track + drawn line: horizontal on md+, vertical on mobile */}
      <span aria-hidden className="absolute left-7 top-7 bottom-7 w-px bg-line md:hidden" />
      <motion.span
        aria-hidden
        style={{ scaleY: scale }}
        className="absolute left-7 top-7 bottom-7 w-px origin-top bg-accent md:hidden"
      />
      <span aria-hidden className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-line md:block" />
      <motion.span
        aria-hidden
        style={{ scaleX: scale }}
        className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px origin-left bg-accent md:block"
      />

      {STEPS.map(({ icon: Icon, title, body }, i) => (
        <motion.li
          key={title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: i * 0.1 }}
          className="relative flex items-start gap-5 md:flex-col md:items-center md:text-center"
        >
          <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-soft ring-1 ring-line">
            <Icon className="size-5" />
            <span className="tabular absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-ink">
              {i + 1}
            </span>
          </span>
          <div className="pt-2 md:pt-0">
            <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink md:mt-5">{title}</h3>
            <p className="mt-1.5 max-w-64 text-[14.5px] leading-relaxed text-muted">{body}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
