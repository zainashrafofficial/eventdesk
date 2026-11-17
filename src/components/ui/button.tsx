import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap",
    "rounded-full font-medium tracking-[-0.005em]",
    "transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-200 ease-out",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-ink-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]",
        accent: "bg-accent text-accent-ink hover:bg-accent-hover",
        secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
        outline: "border border-ink/15 text-ink hover:border-ink/35 hover:bg-ink/[0.03]",
        ghost: "text-ink-2 hover:bg-ink/[0.05] hover:text-ink",
        link: "h-auto rounded-none px-0 text-accent underline-offset-4 hover:underline active:scale-100",
        danger: "bg-danger text-paper hover:bg-danger/90",
        "danger-ghost": "text-danger hover:bg-danger-soft",
      },
      size: {
        xs: "h-8 px-3 text-xs [&_svg]:size-3.5",
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Spinner />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
