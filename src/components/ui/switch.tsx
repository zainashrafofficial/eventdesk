"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Apple-style toggle switch. Renders a native <button role="switch"> so it is keyboard
 * and screen-reader accessible out of the box (Space / Enter toggle it).
 * Pair it with a visible <label htmlFor={id}> or pass `label` for an accessible name.
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
      className={cn(
        "group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5",
        "transition-[background-color,box-shadow,opacity] duration-300 ease-[var(--ease-out-expo)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-45",
        sm ? "h-5 w-8" : "h-[1.6rem] w-[2.85rem]",
        checked ? "bg-success" : "bg-ink/[0.14] shadow-[inset_0_0_0_1px_rgb(var(--shadow-color)/0.04)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block rounded-full bg-white",
          "shadow-[0_1px_2px_rgb(0_0_0/0.12),0_3px_8px_rgb(0_0_0/0.14)]",
          "transition-[transform,width] duration-300 ease-[var(--ease-out-expo)]",
          sm ? "size-4" : "size-[1.35rem]",
          "group-active/switch:w-[1.6rem]",
          sm && "group-active/switch:w-[1.15rem]",
          checked && (sm ? "translate-x-3 group-active/switch:translate-x-[0.6rem]" : "translate-x-[1.25rem] group-active/switch:translate-x-[1rem]"),
        )}
      />
    </button>
  );
}
