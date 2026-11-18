"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AuroraGlow, EASE_OUT_EXPO } from "./motion-primitives";

/** Animated soft gradient backdrop for the auth pages. */
export function AuthBackdrop() {
  return (
    <>
      <AuroraGlow intensity={0.8} />
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 mask-fade-b opacity-60" />
    </>
  );
}

/** Spring-in wrapper for the auth column (mark + heading + card). */
export function AuthEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/** The form card itself: springs in slightly after the heading. */
export function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24, delay: 0.12 }}
      className={cn("glass rounded-3xl border border-line p-6 shadow-lift sm:p-8", className)}
    >
      {children}
    </motion.div>
  );
}
