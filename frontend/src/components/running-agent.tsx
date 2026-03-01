"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useParams, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { api } from "../../convex/_generated/api";
import QuestionCard, {
  type AskHumanAnswersPayload,
  type AskHumanQuestion,
} from "./human-tool-call";
import PlaceSelectionCard, {
  type PlaceOption,
  type PlaceSelectionPayload,
} from "./place-selection-card";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ItineraryStop = {
  id?: string;
  name: string;
  category?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  start_time?: string;
  end_time?: string;
  image_url?: string;
};

type ItinerarySession = {
  label: string;
  items: ItineraryStop[];
  transfer_note?: string;
};

type ItineraryDay = {
  day_number: number;
  title: string;
  date_label?: string;
  activities_count?: number;
  budget_label?: string;
  sessions: ItinerarySession[];
  route?: {
    distance_km?: number;
    duration_min?: number;
    map_image_url?: string;
  };
};

type ItineraryPayload = {
  itinerary_title?: string;
  destination?: string;
  days: ItineraryDay[];
};

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return raw.trim();
  }
  return raw.slice(firstBrace, lastBrace + 1).trim();
}

function parseItineraryPayload(raw: string): ItineraryPayload | null {
  if (!raw.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as ItineraryPayload;
    if (!parsed || !Array.isArray(parsed.days)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function ItineraryView({ itinerary }: { itinerary: ItineraryPayload }) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const activeDay = itinerary.days[activeDayIndex];
  const mapPlaceholder =
    activeDay?.route?.map_image_url ||
    "https://placehold.co/640x980/e8f3ff/4b6584?text=Google+Map+Placeholder";
  const mapPoints = useMemo(() => {
    if (!activeDay) {
      return [] as Array<{
        name: string;
        location?: string;
        start_time?: string;
        end_time?: string;
        lat: number;
        lng: number;
      }>;
    }

    return activeDay.sessions.flatMap((session) =>
      session.items.flatMap((item) => {
        const lat = item.coordinates?.lat;
        const lng = item.coordinates?.lng;

        if (typeof lat !== "number" || Number.isNaN(lat)) {
          return [];
        }

        if (typeof lng !== "number" || Number.isNaN(lng)) {
          return [];
        }

        return [
          {
            name: item.name,
            location: item.location,
            start_time: item.start_time,
            end_time: item.end_time,
            lat,
            lng,
          },
        ];
      }),
    );
  }, [activeDay]);

  if (!activeDay) {
    return null;
  }

  return (
    <div className="mx-auto mt-6 grid w-full max-w-[1250px] gap-4 rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_24px_64px_rgba(15,23,42,0.12)] backdrop-blur-md lg:grid-cols-[260px_1fr_340px]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-2xl font-semibold text-slate-900">Itinerary</h2>
        <p className="mt-1 text-xs text-slate-500">{itinerary.itinerary_title || itinerary.destination || "Trip Plan"}</p>
        <div className="mt-4 space-y-2">
          {itinerary.days.map((day, idx) => {
            const active = idx === activeDayIndex;
            return (
              <button
                key={`${day.day_number}-${day.title}`}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-cyan-300 bg-cyan-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold text-slate-800">{day.day_number}. {day.title}</p>
                <p className="text-xs text-slate-500">{day.date_label || "Planned"}</p>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600">Active Day</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Day {activeDay.day_number}: {activeDay.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {activeDay.date_label || "Planned date"} • {activeDay.activities_count ?? 0} Activities • {activeDay.budget_label || "Budget TBD"}
          </p>
        </div>

        <div className="mt-4 space-y-5">
          {activeDay.sessions.map((session) => (
            <section key={session.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {session.label}
              </p>
              <div className="space-y-3">
                {session.items.map((item, idx) => (
                  <article key={item.id || `${item.name}-${idx}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-16 w-16 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-[radial-gradient(circle_at_top_left,#22d3ee_0%,#0ea5e9_35%,#1e293b_100%)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-base font-semibold text-slate-900">{item.name}</p>
                        {item.category ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                            {item.category}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">{item.location || "Location TBD"}</p>
                      <p className="mt-1 text-xs font-semibold text-cyan-600">
                        {item.start_time || "--:--"} - {item.end_time || "--:--"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              {session.transfer_note ? (
                <p className="mt-2 text-xs text-slate-500">{session.transfer_note}</p>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>{activeDay.route?.distance_km ?? 0} km</span>
          <span>{activeDay.route?.duration_min ?? 0} min</span>
          <span className="font-semibold text-cyan-600">View details</span>
        </footer>
      </main>

      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {mapPoints.length ? (
          <MapContainer
            key={`day-map-${activeDay.day_number}`}
            center={[mapPoints[0].lat, mapPoints[0].lng]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full min-h-[360px] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapPoints.length > 1 ? (
              <Polyline
                positions={mapPoints.map((point) => [point.lat, point.lng])}
                pathOptions={{ color: "#0891b2", weight: 3, opacity: 0.75 }}
              />
            ) : null}
            {mapPoints.map((point, idx) => (
              <CircleMarker
                key={`${point.name}-${point.lat}-${point.lng}-${idx}`}
                center={[point.lat, point.lng]}
                radius={7}
                pathOptions={{ color: "#0e7490", fillColor: "#06b6d4", fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{idx + 1}. {point.name}</p>
                    <p>{point.location || "Location"}</p>
                    <p>
                      {point.start_time || "--:--"} - {point.end_time || "--:--"}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <img src={mapPlaceholder} alt="Map placeholder" className="h-full w-full object-cover" />
        )}
      </aside>
    </div>
  );
}

const RunningAgent = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("q")?.trim() ?? "";
  const [createdThreadId, setCreatedThreadId] = useState<string | null>(null);

  const hasUpdatedSessionRef = useRef(false);
  const hasSubmittedInitialPromptRef = useRef(false);

  const existingSession = useQuery(
    api.sessions.get,
    urlSessionId ? { sessionId: urlSessionId as any } : "skip",
  );
  const updateSession = useMutation(api.sessions.update);

  const currentSessionId = useMemo(() => {
    return existingSession?._id ?? urlSessionId;
  }, [existingSession?._id, urlSessionId]);

  const threadId = useMemo(() => {
    return existingSession?.threadId ?? createdThreadId;
  }, [existingSession?.threadId, createdThreadId]);

  const validThreadId = useMemo(() => {
    return threadId && UUID_REGEX.test(threadId) ? threadId : undefined;
  }, [threadId]);

  const { submit, messages, isLoading, interrupt } = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
    threadId: validThreadId,
    onThreadId: (newThreadId) => {
      if (!newThreadId || !UUID_REGEX.test(newThreadId)) {
        return;
      }

      setCreatedThreadId(newThreadId);

      if (!hasUpdatedSessionRef.current && urlSessionId) {
        hasUpdatedSessionRef.current = true;
        void updateSession({
          sessionId: urlSessionId as any,
          threadId: newThreadId,
          title: "New Chat",
        });
      }
    },
  });

  React.useEffect(() => {
    if (!initialPrompt || hasSubmittedInitialPromptRef.current || !currentSessionId) {
      return;
    }

    hasSubmittedInitialPromptRef.current = true;

    const submitInitialPrompt = async () => {
      try {
        window.history.replaceState({}, "", `/chat/${currentSessionId}`);
        const title =
          initialPrompt.slice(0, 50) + (initialPrompt.length > 50 ? "..." : "");

        await updateSession({ sessionId: currentSessionId as any, title });
        await submit({
          messages: [{ content: initialPrompt, type: "human" }],
        });
      } catch (error) {
        hasSubmittedInitialPromptRef.current = false;
        console.error("Failed to submit initial prompt:", error);
        toast.error("Failed to submit your trip request");
      }
    };

    void submitInitialPrompt();
  }, [currentSessionId, initialPrompt, submit, updateSession]);

  const interruptUi = useMemo<
    | { kind: "ask-single"; question: string; choices: string[] }
    | { kind: "ask-multi"; questions: AskHumanQuestion[] }
    | {
        kind: "select-places";
        prompt: string;
        places: PlaceOption[];
        minSelect?: number;
        maxSelect?: number | null;
      }
    | null
  >(() => {
    if (!interrupt) {
      return null;
    }

    const val = (interrupt as any).value;
    if (!val || typeof val !== "object") {
      return null;
    }

    if (val.type === "select_places" && Array.isArray(val.places)) {
      return {
        kind: "select-places",
        prompt: val.prompt || "Select places to include in your itinerary",
        places: val.places as PlaceOption[],
        minSelect: val.min_select,
        maxSelect: val.max_select,
      };
    }

    if (Array.isArray(val.questions) && val.questions.length) {
      return {
        kind: "ask-multi",
        questions: val.questions as AskHumanQuestion[],
      };
    }

    if (!val.question) {
      return null;
    }

    let choices = val.choices || [];
    if (!choices.length && typeof val.question === "string") {
      const choicesMatch = val.question.match(/\(choices:\s*([^)]+)\)/i);
      if (choicesMatch) {
        choices = choicesMatch[1].split(/\s*\/\s*/).map((c: string) => c.trim());
      }
    }

    return {
      kind: "ask-single",
      question: String(val.question).replace(/\(choices:\s*[^)]+\)/gi, "").trim(),
      choices,
    };
  }, [interrupt]);

  const handleInterruptSubmit = useCallback(
    async (answer: string | AskHumanAnswersPayload | PlaceSelectionPayload) => {
      try {
        await submit(null, {
          command: {
            resume: answer,
          },
        });
      } catch (error) {
        console.error("Failed to resume stream:", error);
        toast.error("Failed to send answer");
      }
    },
    [submit],
  );

  const latestAssistantContent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.type !== "ai") {
        continue;
      }

      if (Array.isArray(msg.content)) {
        return msg.content
          .map((part: any) => part.text || part.content || "")
          .filter(Boolean)
          .join("\n");
      }

      return String(msg.content || "");
    }

    return "";
  }, [messages]);

  const itineraryPayload = useMemo(() => {
    return parseItineraryPayload(latestAssistantContent);
  }, [latestAssistantContent]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f7fbff_40%,#f8f9fb_100%)] px-4 py-8 md:px-8">
      {interruptUi?.kind === "select-places" ? (
        <PlaceSelectionCard
          prompt={interruptUi.prompt}
          places={interruptUi.places}
          minSelect={interruptUi.minSelect}
          maxSelect={interruptUi.maxSelect}
          onSubmit={(payload) => void handleInterruptSubmit(payload)}
        />
      ) : null}

      {interruptUi?.kind === "ask-single" || interruptUi?.kind === "ask-multi" ? (
        <div className="mx-auto mt-8 w-full max-w-3xl">
          <QuestionCard
            question={interruptUi.kind === "ask-single" ? interruptUi.question : undefined}
            choices={interruptUi.kind === "ask-single" ? interruptUi.choices : undefined}
            questions={interruptUi.kind === "ask-multi" ? interruptUi.questions : undefined}
            onAnswer={(answer) => void handleInterruptSubmit(answer)}
          />
        </div>
      ) : null}

      {!interruptUi ? (
        <div className="mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-white/90 bg-white/85 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)] backdrop-blur-md md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
            Trip Planner
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Building your itinerary
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This screen updates automatically when we need your input.
          </p>

          {isLoading ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-sm text-cyan-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
              Planning in progress...
            </div>
          ) : null}

          {itineraryPayload ? (
            <ItineraryView itinerary={itineraryPayload} />
          ) : latestAssistantContent ? (
            <article className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 md:text-base">
              {latestAssistantContent}
            </article>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default RunningAgent;
