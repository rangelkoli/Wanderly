import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-stone-300 bg-white/80 px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition focus-visible:ring-4 focus-visible:ring-orange-500/15",
        className,
      )}
      {...props}
    />
  );
}
