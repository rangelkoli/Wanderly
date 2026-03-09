import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-xl border border-stone-300 bg-white/80 px-3 py-3 text-sm text-stone-950 shadow-sm outline-none transition focus-visible:ring-4 focus-visible:ring-orange-500/15",
        className,
      )}
      {...props}
    />
  );
}
