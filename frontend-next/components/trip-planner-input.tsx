"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Mic, ImagePlus, ArrowRight, Sparkles, Loader2 } from "lucide-react";

export function TripPlannerInput() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handlePlanTrip = async () => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      console.error("Error creating trip session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-2xl rounded-xl border border-border bg-card shadow-lg",
        "focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-primary/40",
        "transition-shadow",
      )}
    >
      <div className='flex items-start gap-3 px-4 pt-4'>
        <Sparkles className='size-5 shrink-0 text-primary mt-0.5' />
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Describe your dream trip... (e.g., A 10-day food tour in Japan with a focus on hidden gems)'
          rows={3}
          className={cn(
            "w-full resize-none bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handlePlanTrip();
            }
          }}
        />
      </div>
      <div className='flex items-center justify-between px-4 pb-3 pt-2'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            aria-label='Voice input'
            className={cn(
              "inline-flex items-center justify-center rounded-md p-2",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-colors",
            )}
          >
            <Mic className='size-5' />
          </button>
          <button
            type='button'
            aria-label='Upload image'
            className={cn(
              "inline-flex items-center justify-center rounded-md p-2",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-colors",
            )}
          >
            <ImagePlus className='size-5' />
          </button>
        </div>
        <button
          type='button'
          onClick={handlePlanTrip}
          disabled={isLoading || !query.trim()}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
            "bg-primary text-primary-foreground text-sm font-semibold tracking-wide uppercase",
            "hover:bg-primary/90 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              Planning...
            </>
          ) : (
            <>
              Plan Trip
              <ArrowRight className='size-4' />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
