"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import {
  describeEventData,
  extractInterrupts,
  extractItineraryFromMessages,
  extractLatestFlightSearch,
  extractMessages,
  type FlightOption,
  type FlightSearchPayload,
  getSessionStateApiPath,
  getSessionStreamApiPath,
  type ItineraryPayload,
  type LangGraphStateResponse,
  type SessionInterrupt,
  type SessionMessage,
  tryParseJson,
} from "@/lib/langgraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type StreamEventRecord = {
  id: string;
  event: string;
  receivedAt: string;
  data: unknown;
  preview: string;
};

type SessionStreamProps = {
  sessionId: string;
};

function formatMessageTitle(message: SessionMessage) {
  if (message.role === "tool") {
    return message.name ? `Tool · ${message.name}` : "Tool";
  }

  if (message.role === "assistant") {
    return "Assistant";
  }

  if (message.role === "user") {
    return "User";
  }

  return "System";
}

function eventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function parseEventData(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  return tryParseJson(trimmed) ?? trimmed;
}

function formatFlightStops(stops?: number) {
  if (typeof stops !== "number") {
    return "Stops unknown";
  }

  if (stops === 0) {
    return "Nonstop";
  }

  if (stops === 1) {
    return "1 stop";
  }

  return `${stops} stops`;
}

function formatFlightPrice(price?: number) {
  return typeof price === "number" ? `$${price}` : "Price unavailable";
}

const FALLBACK_PLACE_IMAGE =
  "https://placehold.co/600x400/e8f3ff/4b6584?text=Place+Image";

function buildFlightSummary(option: FlightOption) {
  return [
    option.airline ?? "Unknown airline",
    `${option.departure_airport ?? "?"} ${option.departure_time ?? "--"} -> ${option.arrival_airport ?? "?"} ${option.arrival_time ?? "--"}`,
    option.duration ?? "Duration unavailable",
    formatFlightStops(option.stops),
  ].join(" · ");
}

function updateStateFromPayload(
  payload: unknown,
  setMessages: React.Dispatch<React.SetStateAction<SessionMessage[]>>,
  setItinerary: React.Dispatch<React.SetStateAction<ItineraryPayload | null>>,
  setLatestFlightSearch: React.Dispatch<
    React.SetStateAction<FlightSearchPayload | null>
  >,
) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const nextMessages = extractMessages(payload as Record<string, unknown>);
  if (!nextMessages.length) {
    return;
  }

  startTransition(() => {
    setMessages(nextMessages);
    setItinerary(extractItineraryFromMessages(nextMessages));
    setLatestFlightSearch(extractLatestFlightSearch(nextMessages));
  });
}

export function SessionStream({ sessionId }: SessionStreamProps) {
  const [events, setEvents] = useState<StreamEventRecord[]>([]);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryPayload | null>(null);
  const [latestFlightSearch, setLatestFlightSearch] =
    useState<FlightSearchPayload | null>(null);
  const [statePayload, setStatePayload] = useState<LangGraphStateResponse | null>(
    null,
  );
  const [pendingInterrupt, setPendingInterrupt] = useState<SessionInterrupt | null>(
    null,
  );
  const [humanAnswers, setHumanAnswers] = useState<Record<string, string>>({});
  const [selectedFlightOption, setSelectedFlightOption] = useState<number | null>(
    null,
  );
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const autoStartedRef = useRef(false);

  const loadState = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(getSessionStateApiPath(sessionId), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to load session state (${response.status}).`);
      }

      const payload = (await response.json()) as LangGraphStateResponse;
      setStatePayload(payload);

      const nextMessages = extractMessages(payload);
      const nextInterrupt = extractInterrupts(payload)[0] ?? null;
      setMessages(nextMessages);
      setItinerary(extractItineraryFromMessages(nextMessages));
      setLatestFlightSearch(extractLatestFlightSearch(nextMessages));
      setPendingInterrupt(nextInterrupt);
      setHumanAnswers((current) => {
        if (!nextInterrupt || !nextInterrupt.questions.length) {
          return {};
        }

        const nextValues: Record<string, string> = {};
        for (const question of nextInterrupt.questions) {
          nextValues[question.id] = current[question.id] ?? "";
        }
        return nextValues;
      });
      setSelectedFlightOption((current) => {
        if (nextInterrupt?.kind !== "select_flight") {
          return null;
        }

        if (
          current !== null &&
          nextInterrupt.flightOptions.some(
            (option) => option.option_id === current,
          )
        ) {
          return current;
        }

        return nextInterrupt.flightOptions[0]?.option_id ?? null;
      });
      setStatus("idle");
    } catch (loadError) {
      setStatus("error");
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load state.",
      );
    }
  }, [sessionId]);

  const startStream = useCallback(async (nextPrompt?: string, resume?: unknown) => {
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    setStatus("streaming");
    setError(null);

    try {
      const response = await fetch(getSessionStreamApiPath(sessionId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: nextPrompt?.trim() ? nextPrompt.trim() : undefined,
          resume,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const failure = await response.text();
        throw new Error(failure || `Unable to start stream (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const lines = segment.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event:"));
          const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart());

          if (!dataLines.length) {
            continue;
          }

          const event = eventLine?.slice(6).trim() || "message";
          const data = parseEventData(dataLines.join("\n"));

          if (data == null) {
            continue;
          }

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

          const nextInterrupt = extractInterrupts(
            data as Record<string, unknown>,
          )[0] ?? null;

          startTransition(() => {
            setPendingInterrupt(nextInterrupt);
            setHumanAnswers((current) => {
              if (!nextInterrupt || !nextInterrupt.questions.length) {
                return {};
              }

              const nextValues: Record<string, string> = {};
              for (const question of nextInterrupt.questions) {
                nextValues[question.id] = current[question.id] ?? "";
              }
              return nextValues;
            });
            setSelectedFlightOption((current) => {
              if (nextInterrupt?.kind !== "select_flight") {
                return null;
              }

              if (
                current !== null &&
                nextInterrupt.flightOptions.some(
                  (option) => option.option_id === current,
                )
              ) {
                return current;
              }

              return nextInterrupt.flightOptions[0]?.option_id ?? null;
            });
          });
        }
      }

      await loadState();
    } catch (streamError) {
      if (controller.signal.aborted) {
        return;
      }

      setStatus("error");
      setError(
        streamError instanceof Error
          ? streamError.message
          : "Streaming failed unexpectedly.",
      );
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    }
  }, [loadState, sessionId]);

  useEffect(() => {
    autoStartedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (autoStartedRef.current || status === "loading" || pendingInterrupt) {
      return;
    }

    autoStartedRef.current = true;
    void startStream();
  }, [pendingInterrupt, startStream, status]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const nextNodes =
    Array.isArray(statePayload?.next) && statePayload.next.length
      ? statePayload.next.join(", ")
      : "No queued nodes";

  const canResumeAskHuman =
    pendingInterrupt?.kind === "ask_human" && pendingInterrupt.questions.length > 0;
  const canResumeFlightSelection =
    pendingInterrupt?.kind === "select_flight" &&
    pendingInterrupt.flightOptions.length > 0;

  async function handleResumeAskHuman() {
    if (!pendingInterrupt || !canResumeAskHuman) {
      return;
    }

    const answers = pendingInterrupt.questions.map((question) => ({
      id: question.id,
      answer: (humanAnswers[question.id] ?? "").trim(),
    }));

    if (answers.some((answer) => !answer.answer)) {
      setError("Please answer every question before resuming the session.");
      return;
    }

    const resumePayload =
      answers.length === 1
        ? answers[0].answer
        : {
            answers,
          };

    await startStream(undefined, resumePayload);
  }

  async function handleResumeFlightSelection() {
    if (!pendingInterrupt || !canResumeFlightSelection || selectedFlightOption === null) {
      return;
    }

    await startStream(undefined, { option_id: selectedFlightOption });
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="overflow-hidden bg-[linear-gradient(140deg,rgba(255,248,238,0.96),rgba(255,255,255,0.72))]">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Badge>LangGraph Session</Badge>
                <div className="space-y-2">
                  <CardTitle className="text-3xl sm:text-4xl">
                    Session {sessionId}
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-base">
                    Loads the current checkpoint from the LangGraph backend,
                    starts a streaming run for this thread, and renders the raw
                    backend events alongside the parsed itinerary JSON.
                  </CardDescription>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Status
                  </div>
                  <div className="mt-2 text-base font-semibold text-stone-950">
                    {status}
                  </div>
                </div>
                <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Next Nodes
                  </div>
                  <div className="mt-2 text-base font-semibold text-stone-950">
                    {nextNodes}
                  </div>
                </div>
                <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Messages
                  </div>
                  <div className="mt-2 text-base font-semibold text-stone-950">
                    {messages.length}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-6">
            {canResumeAskHuman ? (
              <Card className="border-orange-300/80 bg-orange-50/70">
                <CardHeader>
                  <CardTitle>Human Input Required</CardTitle>
                  <CardDescription>
                    The backend paused on `ask_human`. Answer below to resume this
                    session.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingInterrupt.questions.map((question) => (
                    <div className="space-y-3" key={question.id}>
                      <div className="text-sm font-semibold text-stone-950">
                        {question.question}
                      </div>
                      {question.choices.length ? (
                        <div className="flex flex-wrap gap-2">
                          {question.choices.map((choice) => (
                            <button
                              className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 transition hover:border-orange-400 hover:text-orange-700"
                              key={choice}
                              onClick={() =>
                                setHumanAnswers((current) => ({
                                  ...current,
                                  [question.id]: choice,
                                }))
                              }
                              type="button"
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <Textarea
                        onChange={(event) =>
                          setHumanAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        placeholder="Type your answer"
                        value={humanAnswers[question.id] ?? ""}
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={status === "streaming"}
                      onClick={() => void handleResumeAskHuman()}
                      variant="secondary"
                    >
                      {status === "streaming" ? "Resuming..." : "Resume session"}
                    </Button>
                    <Button
                      disabled={status === "loading"}
                      onClick={() => void loadState()}
                      variant="outline"
                    >
                      Refresh state
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {canResumeFlightSelection ? (
              <Card className="border-sky-300/80 bg-sky-50/70">
                <CardHeader>
                  <CardTitle>Choose a Flight</CardTitle>
                  <CardDescription>
                    {pendingInterrupt.prompt ??
                      "The backend paused on `flights_finder`. Select a flight to resume the session."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {pendingInterrupt.flightOptions.map((option) => {
                      const isSelected = selectedFlightOption === option.option_id;

                      return (
                        <button
                          className={`rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? "border-sky-500 bg-white shadow-sm"
                              : "border-sky-200/80 bg-white/70 hover:border-sky-400"
                          }`}
                          key={`${pendingInterrupt.id}-${option.option_id}`}
                          onClick={() => setSelectedFlightOption(option.option_id)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-stone-950">
                                Option {option.option_id}
                              </div>
                              <div className="mt-1 text-sm text-stone-700">
                                {buildFlightSummary(option)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="bg-white">
                                {formatFlightPrice(option.price)}
                              </Badge>
                              {option.cabin ? (
                                <Badge className="bg-white">{option.cabin}</Badge>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={status === "streaming" || selectedFlightOption === null}
                      onClick={() => void handleResumeFlightSelection()}
                      variant="secondary"
                    >
                      {status === "streaming" ? "Submitting..." : "Use selected flight"}
                    </Button>
                    <Button
                      disabled={status === "loading"}
                      onClick={() => void loadState()}
                      variant="outline"
                    >
                      Refresh state
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Continue Session</CardTitle>
                <CardDescription>
                  {canResumeAskHuman || canResumeFlightSelection
                    ? "This thread is paused for a required tool response. Resume it above before sending a new prompt."
                    : "Send the next user prompt into the existing backend thread."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  disabled={canResumeAskHuman || canResumeFlightSelection}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ask Wanderly to refine the itinerary, change flights, or regenerate a day."
                  value={prompt}
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      status === "streaming" ||
                      canResumeAskHuman ||
                      canResumeFlightSelection
                    }
                    onClick={() => void startStream(prompt)}
                    variant="secondary"
                  >
                    {status === "streaming" ? "Streaming..." : "Send and stream"}
                  </Button>
                  <Button
                    disabled={status === "loading"}
                    onClick={() => void loadState()}
                    variant="outline"
                  >
                    Refresh state
                  </Button>
                </div>
                {error ? (
                  <p className="text-sm text-red-700">{error}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversation State</CardTitle>
                <CardDescription>
                  Normalized messages pulled from the thread checkpoint.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.length ? (
                  messages.map((message) => (
                    <div
                      className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4"
                      key={message.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-stone-950">
                          {formatMessageTitle(message)}
                        </div>
                        <Badge className="bg-white">{message.role}</Badge>
                      </div>
                      {message.toolCalls?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.toolCalls.map((toolCall, index) => (
                            <Badge key={`${message.id}-tool-${index}`}>
                              {toolCall.name ?? "tool_call"}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-white/85 p-3 text-xs leading-6 text-stone-700">
                        {message.content || "(empty message)"}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
                    No messages were found in the current thread state yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {!canResumeFlightSelection && latestFlightSearch ? (
              <Card className="border-sky-200/80 bg-sky-50/40">
                <CardHeader>
                  <CardTitle>Latest Flight Results</CardTitle>
                  <CardDescription>
                    {latestFlightSearch.type === "no_flights_found"
                      ? latestFlightSearch.message ?? "No flights were returned by the backend."
                      : latestFlightSearch.prompt ??
                        "Most recent `flights_finder` output from the backend."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestFlightSearch.type === "select_flight" ? (
                    latestFlightSearch.flightOptions.map((option) => (
                      <div
                        className="rounded-2xl border border-sky-200/80 bg-white/85 p-4"
                        key={`latest-flight-${option.option_id}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-stone-950">
                              Option {option.option_id}
                            </div>
                            <div className="mt-1 text-sm text-stone-700">
                              {buildFlightSummary(option)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-white">
                              {formatFlightPrice(option.price)}
                            </Badge>
                            {option.cabin ? (
                              <Badge className="bg-white">{option.cabin}</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-sky-200 bg-white/85 p-4 text-sm text-stone-700">
                      {latestFlightSearch.message ?? "No flights found."}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Backend Events</CardTitle>
                <CardDescription>
                  Raw server-sent events from the LangGraph run stream.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length ? (
                  events.map((event) => (
                    <div
                      className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4"
                      key={event.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-stone-950">
                            {event.event}
                          </div>
                          <div className="text-xs text-stone-500">
                            {event.receivedAt}
                          </div>
                        </div>
                        <Badge className="bg-white">{event.preview}</Badge>
                      </div>
                      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/85 p-3 text-xs leading-6 text-stone-700">
                        {formatJson(event.data)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
                    Waiting for streamed events from the backend.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parsed Itinerary</CardTitle>
                <CardDescription>
                  Extracted from the latest assistant JSON response.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {itinerary ? (
                  <>
                    <div className="space-y-2">
                      <div className="text-2xl font-semibold text-stone-950">
                        {itinerary.itinerary_title}
                      </div>
                      <p className="text-sm text-stone-600">
                        {itinerary.destination} · {itinerary.days.length} days
                      </p>
                    </div>

                    {itinerary.selected_flight ? (
                      <>
                        <Separator />
                        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                          <div className="text-sm font-semibold text-stone-950">
                            Selected flight
                          </div>
                          <p className="mt-2 text-sm leading-6 text-stone-700">
                            {itinerary.selected_flight.airline ?? "Unknown airline"} ·{" "}
                            {itinerary.selected_flight.departure_airport ?? "?"} to{" "}
                            {itinerary.selected_flight.arrival_airport ?? "?"} ·{" "}
                            {itinerary.selected_flight.price
                              ? `$${itinerary.selected_flight.price}`
                              : "Price unavailable"}
                          </p>
                        </div>
                      </>
                    ) : null}

                    <Separator />

                    <div className="space-y-4">
                      {itinerary.days.map((day) => (
                        <div
                          className="rounded-[28px] border border-stone-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(247,242,235,0.92))] p-5"
                          key={day.day_number}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                Day {day.day_number}
                              </div>
                              <div className="mt-1 text-lg font-semibold text-stone-950">
                                {day.title}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge>{day.date_label}</Badge>
                              <Badge>{day.budget_label}</Badge>
                              <Badge>{day.activities_count} activities</Badge>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3">
                            {day.sessions.map((session, index) => (
                              <div
                                className="rounded-2xl border border-stone-200 bg-white/85 p-4"
                                key={`${day.day_number}-${session.label}-${index}`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-stone-950">
                                    {session.label}
                                  </div>
                                  {session.transfer_note ? (
                                    <div className="text-xs text-stone-500">
                                      {session.transfer_note}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="mt-3 grid gap-3">
                                  {session.items.map((item) => (
                                    <div
                                      className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-3 sm:grid-cols-[96px_1fr]"
                                      key={item.id}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        alt={item.name}
                                        className="h-24 w-full rounded-xl object-cover"
                                        loading="lazy"
                                        onError={(event) => {
                                          event.currentTarget.onerror = null;
                                          event.currentTarget.src = FALLBACK_PLACE_IMAGE;
                                        }}
                                        src={item.image_url || FALLBACK_PLACE_IMAGE}
                                      />
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="text-sm font-semibold text-stone-950">
                                            {item.name}
                                          </div>
                                          <Badge className="bg-white">
                                            {item.category}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-stone-600">
                                          {item.location}
                                        </p>
                                        <p className="text-sm text-stone-700">
                                          {item.start_time} - {item.end_time}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {itinerary.sources.length ? (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-stone-950">
                            Sources
                          </div>
                          <div className="flex flex-col gap-2 text-sm text-stone-600">
                            {itinerary.sources.map((source) => (
                              <a
                                className="truncate text-orange-700 underline-offset-4 hover:underline"
                                href={source}
                                key={source}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {source}
                              </a>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
                    The latest assistant message has not produced a valid
                    itinerary JSON payload yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lookup Another Session</CardTitle>
                <CardDescription>
                  Open a different thread by ID.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action="/sessions"
                  className="flex flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const nextSessionId = form.get("sessionId");

                    if (
                      typeof nextSessionId === "string" &&
                      nextSessionId.trim()
                    ) {
                      window.location.href = `/sessions/${encodeURIComponent(nextSessionId.trim())}`;
                    }
                  }}
                >
                  <Input
                    defaultValue={sessionId}
                    name="sessionId"
                    placeholder="thread/session id"
                  />
                  <Button type="submit" variant="outline">
                    Open session
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
