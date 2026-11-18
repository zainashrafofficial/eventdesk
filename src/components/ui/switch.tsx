"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const THUMB_SPRING = { type: "spring", stiffness: 700, damping: 38, mass: 0.7 } as const;

/**
 * Apple-style toggle switch. Renders a native <button role="switch"> so it is keyboard
 * and screen-reader accessible out of the box (Space / Enter toggle it).
 * Pair it with a visible <label htmlFor={id}> or pass `label` for an accessible name.
 * The thumb glides on a spring (layout animation) and stretches slightly while pressed.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
  disabled,
  className,
  size = "md",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";
  const reduce = useReducedMotion();
  const [pressed, setPressed] = React.useState(false);
  const release = () => setPressed(false);

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 touch-manipulation",
        "transition-[background-color,box-shadow,opacity] duration-300 ease-[var(--ease-out-expo)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-45",
        sm ? "h-5 w-8" : "h-[1.6rem] w-[2.85rem]",
        checked ? "justify-end bg-accent" : "justify-start bg-ink/[0.14] shadow-[inset_0_0_0_1px_rgb(var(--shadow-color)/0.04)]",
        className,
      )}
    >
      <motion.span
        aria-hidden
        layout={!reduce}
        transition={THUMB_SPRING}
        style={{ borderRadius: 999 }}
        className={cn(
          "pointer-events-none block bg-white",
          "shadow-[0_1px_2px_rgb(0_0_0/0.12),0_3px_8px_rgb(0_0_0/0.14)]",
          sm ? "h-4" : "h-[1.35rem]",
          pressed && !reduce ? (sm ? "w-[1.15rem]" : "w-[1.6rem]") : sm ? "w-4" : "w-[1.35rem]",
        )}
      />
    </button>
  );
}
