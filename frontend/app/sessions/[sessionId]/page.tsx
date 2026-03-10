import { HeroChat } from "@/components/hero-chat";
import { SessionStream } from "@/components/session-stream";

type SessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  const isValidSession = sessionId && sessionId.trim() !== "";

  if (!isValidSession) {
    return (
      <main className="relative flex min-h-screen w-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#d66b2d]/6 blur-[100px]" />
          <div className="absolute -right-32 top-[30%] h-[400px] w-[400px] rounded-full bg-[#1c7c7d]/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[40%] h-[320px] w-[320px] rounded-full bg-[#d66b2d]/4 blur-[100px]" />
        </div>

        <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d66b2d]">
              <svg className="h-[18px] w-[18px] text-[#fff8ee]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#1f2937]">Wanderly</span>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 md:px-10">
          <div className="w-full max-w-2xl text-center">
            <p className="mb-4 text-sm font-medium tracking-wide text-[#5f6b7a]">
              Your AI travel companion
            </p>
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.15] tracking-tight text-[#1f2937]">
              Where do you want to go?
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#5f6b7a]">
              Describe your dream trip and let Wanderly plan every detail — flights, itinerary, and local picks.
            </p>
          </div>

          <div className="mt-10 w-full max-w-2xl">
            <HeroChat />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "Weekend in Tokyo",
              "10 days across Italy",
              "Budget trip to Bali",
              "Family vacation in Costa Rica",
            ].map((suggestion) => (
              <span
                className="rounded-full border border-[#1f2937]/8 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-[#5f6b7a] backdrop-blur-sm transition-colors hover:border-[#d66b2d]/30 hover:text-[#d66b2d]"
                key={suggestion}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return <SessionStream sessionId={sessionId} />;
}
