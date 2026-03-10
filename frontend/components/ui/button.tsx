import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-stone-950 text-stone-50 shadow-sm hover:bg-stone-800 focus-visible:ring-stone-950/20",
  secondary:
    "bg-orange-500 text-white shadow-sm hover:bg-orange-600 focus-visible:ring-orange-500/25",
  outline:
    "border border-stone-300 bg-white/70 text-stone-900 hover:bg-stone-100 focus-visible:ring-stone-950/10",
  ghost:
    "text-stone-700 hover:bg-stone-100 focus-visible:ring-stone-950/10",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-6",
  icon: "size-10",
};

export function Button({
  asChild = false,
  className,
  children,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  return (
    <Comp
      className={classes}
      type={type}
      {...props}
    >
      {children}
    </Comp>
  );
}
