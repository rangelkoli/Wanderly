import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, Sparkles, Wand2 } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router";
import { useState } from "react";

const starterPrompts = [
  "Romantic weekend in Paris",
  "2 weeks in Japan",
  "Hiking near Denver",
  "Relax in the Maldives",
];

export function Home() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const createSession = useMutation(api.sessions.create);
  const [query, setQuery] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const tempThreadId = `temp_${Date.now()}`;
    
    const newSessionId = await createSession({
      threadId: tempThreadId,
      title: query.slice(0, 50) + (query.length > 50 ? "..." : ""),
    });
    
    navigate(`/chat/${newSessionId}?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#eef5ff_0%,#f7fbff_38%,#f8f9fb_100%)] text-slate-900">
      <div className="pointer-events-none absolute -left-16 top-32 h-48 w-36 rotate-[-8deg] rounded-3xl border border-white/80 bg-[linear-gradient(165deg,#dfe8f5,#eff4fb)] opacity-70 shadow-[0_20px_40px_rgba(15,23,42,0.08)]" />
      <div className="pointer-events-none absolute -right-10 top-20 h-44 w-36 rotate-[6deg] rounded-3xl border border-white/80 bg-[linear-gradient(165deg,#e9eff8,#f9fbff)] opacity-80 shadow-[0_20px_40px_rgba(15,23,42,0.08)]" />
      <div className="pointer-events-none absolute -bottom-8 right-8 h-56 w-44 rotate-[8deg] rounded-3xl border border-white/80 bg-[linear-gradient(165deg,#e3ebf8,#f4f8ff)] opacity-60 shadow-[0_20px_40px_rgba(15,23,42,0.08)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-white">
            <Sparkles size={14} />
          </div>
          <span className="font-semibold tracking-tight">TravelAI</span>
        </div>
        <nav className="hidden items-center gap-8 text-xs font-medium tracking-[0.14em] text-slate-600 md:flex">
          <span>TRIPS</span>
          <span>JOURNAL</span>
          <span>SAVED</span>
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void signOut()}
          className="gap-2 border-slate-300 bg-white/80"
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-12 pt-4">
        <section className="w-full max-w-3xl rounded-[1.8rem] border border-white/80 bg-white/85 px-6 py-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-md md:px-10 md:py-10">
          <h1 className="text-balance font-serif text-5xl leading-[1.04] tracking-tight text-slate-900 md:text-7xl">
            Dream. Describe. Depart.
          </h1>
          <p className="mt-4 text-base italic text-slate-600 md:text-lg">
            Tell us your story, and we&apos;ll craft the perfect journey.
          </p>
        </section>

        <section className="mt-8 w-full max-w-4xl">
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border-2 border-slate-900/90 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
          >
            <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
              <Wand2 className="mt-0.5 text-slate-500" size={16} />
              <textarea
                rows={3}
                className="w-full resize-none border-none bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
                placeholder="Describe your dream trip... (e.g., A 10-day food tour in Japan with a focus on hidden gems)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                AI CONCIERGE READY
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-slate-400 sm:inline">GPT + Travel tools</span>
                <Button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 text-xs font-semibold tracking-[0.12em] text-white hover:bg-slate-800"
                  disabled={!query.trim()}
                >
                  PLAN TRIP
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuery(prompt)}
                className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
