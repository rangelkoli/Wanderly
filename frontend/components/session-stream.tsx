"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  describeEventData,
  extractInterrupts,
  extractItineraryFromMessages,
  extractLatestFlightSearch,
  extractMessages,
  type FlightSearchPayload,
  getSessionStateApiPath,
  getSessionStreamApiPath,
  type ItineraryPayload,
  type LangGraphStateResponse,
  type SessionInterrupt,
  type SessionMessage,
} from "@/lib/langgraph";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EventLog,
  ItineraryDisplay,
  LatestFlightsCard,
} from "@/components/session-stream/displays";
import {
  AskHumanInterrupt,
  FlightSelectionInterrupt,
  ThinkingIndicator,
} from "@/components/session-stream/interrupts";
import {
  eventId,
  formatSessionStatus,
  parseEventData,
  statusColor,
  updateStateFromPayload,
} from "@/components/session-stream/helpers";
import type { StreamEventRecord } from "@/components/session-stream/types";

type SessionStreamProps = {
  sessionId: string;
};

/* ─── Main Component ─── */

export function SessionStream({ sessionId }: SessionStreamProps) {
  const [events, setEvents] = useState<StreamEventRecord[]>([]);
  const [, setMessages] = useState<SessionMessage[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryPayload | null>(null);
  const [latestFlightSearch, setLatestFlightSearch] =
    useState<FlightSearchPayload | null>(null);
  const [statePayload, setStatePayload] =
    useState<LangGraphStateResponse | null>(null);
  const [pendingInterrupt, setPendingInterrupt] =
    useState<SessionInterrupt | null>(null);
  const [humanAnswers, setHumanAnswers] = useState<Record<string, string>>({});
  const [selectedFlightOption, setSelectedFlightOption] = useState<
    number | null
  >(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const autoStartedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<"plan" | "tools">("plan");

  const loadState = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch(getSessionStateApiPath(sessionId), {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(`Unable to load session state (${response.status}).`);
      const payload = (await response.json()) as LangGraphStateResponse;
      setStatePayload(payload);
      const nextMessages = extractMessages(payload);
      const nextInterrupt = extractInterrupts(payload)[0] ?? null;
      setMessages(nextMessages);
      setItinerary(extractItineraryFromMessages(nextMessages));
      setLatestFlightSearch(extractLatestFlightSearch(nextMessages));
      setPendingInterrupt(nextInterrupt);
      setHumanAnswers((current) => {
        if (!nextInterrupt || !nextInterrupt.questions.length) return {};
        const nextValues: Record<string, string> = {};
        for (const question of nextInterrupt.questions) {
          nextValues[question.id] = current[question.id] ?? "";
        }
        return nextValues;
      });
      setSelectedFlightOption((current) => {
        if (nextInterrupt?.kind !== "select_flight") return null;
        if (
          current !== null &&
          nextInterrupt.flightOptions.some((o) => o.option_id === current)
        )
          return current;
        return nextInterrupt.flightOptions[0]?.option_id ?? null;
      });
      setStatus("idle");
    } catch (loadError) {
      setStatus("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load state.",
      );
    }
  }, [sessionId]);

  const startStream = useCallback(
    async (nextPrompt?: string, resume?: unknown) => {
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      setStatus("streaming");
      setError(null);
      try {
        const response = await fetch(getSessionStreamApiPath(sessionId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: nextPrompt?.trim() ? nextPrompt.trim() : undefined,
            resume,
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const failure = await response.text();
          throw new Error(
            failure || `Unable to start stream (${response.status}).`,
          );
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const segments = buffer.split("\n\n");
          buffer = segments.pop() ?? "";
          for (const segment of segments) {
            const lines = segment.split("\n");
            const eventLine = lines.find((line) => line.startsWith("event:"));
            const dataLines = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart());
            if (!dataLines.length) continue;
            const event = eventLine?.slice(6).trim() || "message";
            const data = parseEventData(dataLines.join("\n"));
            if (data == null) continue;
            const nextEvent: StreamEventRecord = {
              id: eventId(),
              event,
              data,
              receivedAt: new Date().toLocaleTimeString(),
              preview: describeEventData(data),
            };
            startTransition(() => {
              setEvents((current) => [nextEvent, ...current].slice(0, 40));
            });
            updateStateFromPayload(
              data,
              setMessages,
              setItinerary,
              setLatestFlightSearch,
            );
            const nextInterrupt =
              extractInterrupts(data as Record<string, unknown>)[0] ?? null;
            startTransition(() => {
              setPendingInterrupt(nextInterrupt);
              setHumanAnswers((current) => {
                if (!nextInterrupt || !nextInterrupt.questions.length)
                  return {};
                const nextValues: Record<string, string> = {};
                for (const question of nextInterrupt.questions) {
                  nextValues[question.id] = current[question.id] ?? "";
                }
                return nextValues;
              });
              setSelectedFlightOption((current) => {
                if (nextInterrupt?.kind !== "select_flight") return null;
                if (
                  current !== null &&
                  nextInterrupt.flightOptions.some(
                    (o) => o.option_id === current,
                  )
                )
                  return current;
                return nextInterrupt.flightOptions[0]?.option_id ?? null;
              });
            });
          }
        }
        await loadState();
      } catch (streamError) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          streamError instanceof Error
            ? streamError.message
            : "Streaming failed unexpectedly.",
        );
      } finally {
        if (streamAbortRef.current === controller)
          streamAbortRef.current = null;
      }
    },
    [loadState, sessionId],
  );

  useEffect(() => {
    autoStartedRef.current = false;
  }, [sessionId]);
  useEffect(() => {
    void loadState();
  }, [loadState]);
  useEffect(() => {
    if (autoStartedRef.current || status === "loading" || pendingInterrupt)
      return;
    autoStartedRef.current = true;
    const savedPrompt =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`wanderly_prompt_${sessionId}`)
        : null;
    if (savedPrompt) {
      sessionStorage.removeItem(`wanderly_prompt_${sessionId}`);
      void startStream(savedPrompt);
    } else {
      void startStream();
    }
  }, [pendingInterrupt, sessionId, startStream, status]);
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const canResumeAskHuman =
    pendingInterrupt?.kind === "ask_human" &&
    pendingInterrupt.questions.length > 0;
  const canResumeFlightSelection =
    pendingInterrupt?.kind === "select_flight" &&
    pendingInterrupt.flightOptions.length > 0;

  async function handleResumeAskHuman() {
    if (!pendingInterrupt || !canResumeAskHuman) return;
    const answers = pendingInterrupt.questions.map((q) => ({
      id: q.id,
      answer: (humanAnswers[q.id] ?? "").trim(),
    }));
    if (answers.some((a) => !a.answer)) {
      setError("Answer each question before continuing.");
      return;
    }
    const resumePayload =
      answers.length === 1 ? answers[0].answer : { answers };
    await startStream(undefined, resumePayload);
  }

  async function handleResumeFlightSelection() {
    if (
      !pendingInterrupt ||
      !canResumeFlightSelection ||
      selectedFlightOption === null
    )
      return;
    const selectedFlight = pendingInterrupt.flightOptions.find(
      (o) => o.option_id === selectedFlightOption,
    );
    if (!selectedFlight) return;
    await startStream(undefined, selectedFlight);
  }

  const nextNodes =
    Array.isArray(statePayload?.next) && statePayload.next.length
      ? statePayload.next.join(", ")
      : "—";

  return (
    <main className='relative min-h-screen overflow-hidden'>
      {/* Background */}
      <div className='pointer-events-none absolute inset-0 z-0'>
        <div className='absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#d66b2d]/5 blur-[100px]' />
        <div className='absolute -right-20 top-1/2 h-80 w-80 rounded-full bg-[#1c7c7d]/4 blur-[100px]' />
      </div>

      <div className='relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10'>
        {/* Header */}
        <header className='anim-fade-in mb-8 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-3'>
              <Link className='flex items-center gap-2' href='/'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#d66b2d]'>
                  <svg
                    className='h-4 w-4 text-[#fff8ee]'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <span className='text-lg font-semibold tracking-tight text-[#1f2937]'>
                  Wanderly
                </span>
              </Link>
              <span className='text-[#1f2937]/15'>/</span>
              <span className='max-w-[200px] truncate text-sm text-[#5f6b7a]'>
                {sessionId}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            {/* Status pill */}
            <div className='flex items-center gap-2 rounded-full border border-[#1f2937]/8 bg-white/70 px-3 py-1.5 backdrop-blur-sm'>
              <div
                className={`h-2 w-2 rounded-full ${statusColor(status)} ${status === "streaming" ? "animate-pulse" : ""}`}
              />
              <span className='text-xs font-semibold text-[#1f2937]'>
                {formatSessionStatus(status)}
              </span>
            </div>
            <div className='hidden items-center gap-3 text-xs text-[#5f6b7a] sm:flex'>
              <span>
                Next:{" "}
                <span className='font-semibold text-[#1f2937]'>
                  {nextNodes}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* Tabs layout */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "plan" | "tools")}
          className='w-full'
        >
          <TabsList className='mb-6 w-full justify-start rounded-lg bg-[#f6efe4] p-1'>
            <TabsTrigger value='plan' className='flex-1 sm:flex-none'>
              <svg
                className='mr-2 h-4 w-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
                />
              </svg>
              Plan
              {itinerary && (
                <span className='ml-2 rounded-full bg-[#d66b2d] px-2 py-0.5 text-xs text-white'>
                  ✓
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='tools' className='flex-1 sm:flex-none'>
              <svg
                className='mr-2 h-4 w-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                />
              </svg>
              Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value='plan' className='mt-0 space-y-6'>
            {/* Thinking indicator: show when AI is working */}
            {status === "streaming" &&
              !canResumeAskHuman &&
              !canResumeFlightSelection && <ThinkingIndicator />}

            {/* Interrupts: top priority */}
            {canResumeAskHuman && (
              <AskHumanInterrupt
                humanAnswers={humanAnswers}
                interrupt={pendingInterrupt}
                isLoading={status === "loading"}
                isStreaming={status === "streaming"}
                key={pendingInterrupt.questions
                  .map((question) => question.id)
                  .join(":")}
                onRefresh={() => void loadState()}
                onResume={() => void handleResumeAskHuman()}
                setHumanAnswers={setHumanAnswers}
              />
            )}

            {canResumeFlightSelection && (
              <FlightSelectionInterrupt
                interrupt={pendingInterrupt}
                isLoading={status === "loading"}
                isStreaming={status === "streaming"}
                onRefresh={() => void loadState()}
                onResume={() => void handleResumeFlightSelection()}
                selectedFlightOption={selectedFlightOption}
                setSelectedFlightOption={setSelectedFlightOption}
              />
            )}

            {/* Follow-up input */}
            <div className='overflow-hidden rounded-2xl border border-[#1f2937]/6 bg-white/80 shadow-sm backdrop-blur-sm'>
              <div className='p-4'>
                <textarea
                  className='w-full resize-none bg-transparent text-sm leading-relaxed text-[#1f2937] outline-none placeholder:text-[#5f6b7a]/40'
                  disabled={canResumeAskHuman || canResumeFlightSelection}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!canResumeAskHuman && !canResumeFlightSelection) {
                        void startStream(prompt);
                      }
                    }
                  }}
                  placeholder={
                    canResumeAskHuman || canResumeFlightSelection
                      ? "Complete the step above first..."
                      : "Ask for changes, add preferences, or request a new itinerary..."
                  }
                  rows={3}
                  value={prompt}
                />
              </div>
              <div className='flex items-center justify-between border-t border-[#1f2937]/5 px-4 py-2.5'>
                <span className='text-xs text-[#5f6b7a]/50'>
                  {error ? (
                    <span className='text-red-600'>{error}</span>
                  ) : (
                    "Shift+Enter for new line"
                  )}
                </span>
                <button
                  className='inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#d66b2d] px-3.5 text-xs font-semibold text-[#fff8ee] transition-all hover:bg-[#c05a24] disabled:opacity-40'
                  disabled={
                    status === "streaming" ||
                    canResumeAskHuman ||
                    canResumeFlightSelection
                  }
                  onClick={() => void startStream(prompt)}
                  type='button'
                >
                  {status === "streaming" ? "Sending..." : "Send"}
                  <svg
                    className='h-3.5 w-3.5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M13 7l5 5m0 0l-5 5m5-5H6'
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Itinerary Display */}
            {itinerary ? (
              <ItineraryDisplay itinerary={itinerary} />
            ) : status === "streaming" ? (
              <div className='space-y-3'>
                {[0, 1, 2].map((i) => (
                  <div
                    className='anim-shimmer anim-stagger h-24 rounded-2xl'
                    key={`skel-${i}`}
                    style={{ "--i": i } as CSSProperties}
                  />
                ))}
              </div>
            ) : (
              <div className='flex flex-col items-center rounded-2xl border border-dashed border-[#1f2937]/10 py-16 text-center'>
                <svg
                  className='mb-3 h-10 w-10 text-[#5f6b7a]/30'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
                  />
                </svg>
                <p className='text-sm font-medium text-[#5f6b7a]'>
                  No itinerary yet
                </p>
                <p className='mt-1 text-xs text-[#5f6b7a]/60'>
                  Send a message to start planning your trip.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value='tools' className='mt-0 space-y-5'>
            {/* Latest flights (if not in selection mode) */}
            {!canResumeFlightSelection && latestFlightSearch && (
              <LatestFlightsCard search={latestFlightSearch} />
            )}

            {/* Event log */}
            <EventLog events={events} />

            {/* Jump to session */}
            <div className='rounded-xl border border-[#1f2937]/6 bg-white/60 p-4'>
              <h4 className='text-xs font-semibold text-[#1f2937]'>
                Switch session
              </h4>
              <form
                className='mt-2 flex gap-2'
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const nextSessionId = form.get("sessionId");
                  if (
                    typeof nextSessionId === "string" &&
                    nextSessionId.trim()
                  ) {
                    window.location.href = `/sessions/${encodeURIComponent(nextSessionId.trim())}`;
                  }
                }}
              >
                <input
                  className='flex-1 rounded-lg border border-[#1f2937]/8 bg-white px-3 py-2 text-xs text-[#1f2937] outline-none placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40'
                  defaultValue={sessionId}
                  name='sessionId'
                  placeholder='Session ID'
                />
                <Button size='sm' type='submit' variant='outline'>
                  Go
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
