"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";

type Mode = "form" | "chat";

export function HeroChat() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("chat");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/langgraph/threads", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { thread_id?: string; id?: string }
        | null;

      if (!response.ok) {
        throw new Error("Unable to create a new session.");
      }

      const threadId = payload?.thread_id ?? payload?.id;
      if (!threadId) {
        throw new Error("Could not create session.");
      }

      // Store the initial prompt so the session page can use it
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`wanderly_prompt_${threadId}`, prompt.trim());
      }

      router.push(`/sessions/${encodeURIComponent(threadId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Animated gradient border wrapper */}
      <div className="relative rounded-[22px] bg-gradient-to-r from-[#d66b2d] via-[#1c7c7d] to-[#d66b2d] p-[2px] animate-border-gradient">
        {/* Main container */}
        <div className="relative overflow-hidden rounded-[20px] bg-white/90 shadow-xl shadow-[#1f2937]/4 backdrop-blur-xl">
        {/* Top bar with mode toggle */}
        <div className="flex items-center justify-between border-b border-[#1f2937]/5 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#1c7c7d]/60" />
            <span className="text-xs font-medium text-[#5f6b7a]">
              {mode === "chat" ? "Describe your trip" : "Fill in details"}
            </span>
          </div>

          {/* Mode toggle */}
          <div className="flex overflow-hidden rounded-lg border border-[#1f2937]/10 bg-[#f6efe4]/60">
            <button
              className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                mode === "form"
                  ? "bg-white text-[#1f2937] shadow-sm"
                  : "text-[#5f6b7a] hover:text-[#1f2937]"
              }`}
              onClick={() => setMode("form")}
              type="button"
            >
              Form
            </button>
            <button
              className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                mode === "chat"
                  ? "bg-white text-[#1f2937] shadow-sm"
                  : "text-[#5f6b7a] hover:text-[#1f2937]"
              }`}
              onClick={() => setMode("chat")}
              type="button"
            >
              Chat
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4">
          {mode === "chat" ? (
            <div className="space-y-3">
              <textarea
                className="w-full resize-none rounded-lg bg-transparent text-sm leading-relaxed text-[#1f2937] outline-none placeholder:text-[#5f6b7a]/50"
                disabled={isLoading}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder="I want to spend 5 days exploring the temples and street food of Bangkok..."
                rows={4}
                value={prompt}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6b7a]">
                  Destination
                </label>
                <input
                  className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                  onChange={(e) =>
                    setPrompt((prev) => {
                      const parts = prev.split(" | ");
                      parts[0] = e.target.value;
                      return parts.filter(Boolean).join(" | ");
                    })
                  }
                  placeholder="Tokyo, Japan"
                  type="text"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6b7a]">
                  Duration
                </label>
                <input
                  className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                  placeholder="5 days"
                  type="text"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6b7a]">
                  Budget
                </label>
                <input
                  className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                  placeholder="$2,000"
                  type="text"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6b7a]">
                  Interests
                </label>
                <input
                  className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                  placeholder="Food, temples, nightlife"
                  type="text"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with submit */}
        <div className="flex items-center justify-between border-t border-[#1f2937]/5 px-4 py-3">
          <div className="text-xs text-[#5f6b7a]/60">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <span>Press Enter to start planning</span>
            )}
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#d66b2d] px-4 text-xs font-semibold text-[#fff8ee] transition-all hover:bg-[#c05a24] hover:shadow-lg hover:shadow-[#d66b2d]/20 disabled:opacity-50"
            disabled={isLoading || !prompt.trim()}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isLoading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                Plan my trip
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
