import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        variant === "default" && "border-stone-200 bg-stone-50 text-stone-700",
        variant === "secondary" && "border-stone-200 bg-stone-100 text-stone-600",
        variant === "outline" && "border-stone-300 text-stone-600",
        className,
      )}
      {...props}
    />
  );
}
