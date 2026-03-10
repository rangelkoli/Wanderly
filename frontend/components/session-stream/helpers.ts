import { startTransition, type Dispatch, type SetStateAction } from "react";

import {
  extractItineraryFromMessages,
  extractLatestFlightSearch,
  extractMessages,
  type FlightSearchPayload,
  type ItineraryPayload,
  type SessionMessage,
  tryParseJson,
} from "@/lib/langgraph";
import type { DayMapPoint } from "./google-day-map-types";

import type { FlightSummaryDetails } from "./types";

export const FALLBACK_PLACE_IMAGE =
  "https://placehold.co/600x400/e8f3ff/4b6584?text=Place+Image";

type DayMapStop = {
  id: string;
  name: string;
  category: string;
  timeLabel: string;
  location: string;
  lat: number;
  lng: number;
};

export function formatSessionStatus(
  status: "idle" | "loading" | "streaming" | "error",
) {
  switch (status) {
    case "loading":
      return "Loading";
    case "streaming":
      return "Thinking";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
}

export function statusColor(
  status: "idle" | "loading" | "streaming" | "error",
) {
  switch (status) {
    case "streaming":
      return "bg-[#1c7c7d]";
    case "loading":
      return "bg-[#d66b2d]";
    case "error":
      return "bg-red-500";
    default:
      return "bg-[#1f2937]/30";
  }
}

export function formatMessageTitle(message: SessionMessage) {
  if (message.role === "tool") {
    return message.name ? `Tool: ${message.name}` : "Tool";
  }
  if (message.role === "assistant") return "Assistant";
  if (message.role === "user") return "You";
  return "System";
}

export function roleAccent(role: string) {
  if (role === "user") return "border-l-[#d66b2d]";
  if (role === "assistant") return "border-l-[#1c7c7d]";
  if (role === "tool") return "border-l-[#9333ea]";
  return "border-l-[#1f2937]/20";
}

export function eventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatJson(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function parseEventData(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return tryParseJson(trimmed) ?? trimmed;
}

export function formatFlightStops(stops?: number) {
  if (typeof stops !== "number") return "Stops unknown";
  if (stops === 0) return "Nonstop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

export function formatFlightPrice(price?: number) {
  return typeof price === "number" && price > 0 ? `$${price}` : "Price n/a";
}

export function formatPriceLevel(level?: string) {
  if (!level) return null;

  const lower = level.toLowerCase();
  if (lower === "low") {
    return { label: "Low price", color: "text-emerald-700 bg-emerald-50" };
  }
  if (lower === "high") {
    return { label: "High price", color: "text-amber-700 bg-amber-50" };
  }
  if (lower === "typical") {
    return { label: "Typical price", color: "text-[#5f6b7a] bg-[#1f2937]/5" };
  }
  return null;
}

export function buildFlightSummary(option: FlightSummaryDetails) {
  return [
    option.airline ?? "Unknown airline",
    `${option.departure_airport ?? "?"} ${option.departure_time ?? "--"} → ${option.arrival_airport ?? "?"} ${option.arrival_time ?? "--"}`,
    option.duration ?? "",
    formatFlightStops(option.stops),
  ]
    .filter(Boolean)
    .join(" · ");
}

function toDayMapStops(day: ItineraryPayload["days"][number]) {
  return day.sessions.flatMap((session) =>
    session.items.flatMap((item) => {
      if (
        !item.coordinates ||
        typeof item.coordinates.lat !== "number" ||
        typeof item.coordinates.lng !== "number"
      ) {
        return [];
      }

      return [
        {
          id: item.id,
          name: item.name,
          category: item.category,
          timeLabel: `${item.start_time} - ${item.end_time}`,
          location: item.location,
          lat: item.coordinates.lat,
          lng: item.coordinates.lng,
        } satisfies DayMapStop,
      ];
    }),
  );
}

function clampMapPoint(value: number) {
  return Math.max(14, Math.min(86, value));
}

function buildMapPoints(stops: DayMapStop[]): DayMapPoint[] {
  if (stops.length === 0) {
    return [];
  }

  const latitudes = stops.map((stop) => stop.lat);
  const longitudes = stops.map((stop) => stop.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);

  return stops.map((stop, index) => {
    const x = clampMapPoint(10 + ((stop.lng - minLng) / lngRange) * 80);
    const y = clampMapPoint(90 - ((stop.lat - minLat) / latRange) * 80);
    return {
      ...stop,
      index,
      x,
      y,
    };
  });
}

export function getDayMapData(day: ItineraryPayload["days"][number]) {
  const points = buildMapPoints(toDayMapStops(day));

  if (points.length === 0) {
    return {
      points,
      googleMapUrl: null,
    };
  }

  const params = new URLSearchParams({
    size: "1200x720",
    points: points.map((point) => `${point.lat},${point.lng}`).join(";"),
  });

  return {
    points,
    googleMapUrl: `/api/google-static-map?${params.toString()}`,
  };
}

export function updateStateFromPayload(
  payload: unknown,
  setMessages: Dispatch<SetStateAction<SessionMessage[]>>,
  setItinerary: Dispatch<SetStateAction<ItineraryPayload | null>>,
  setLatestFlightSearch: Dispatch<SetStateAction<FlightSearchPayload | null>>,
) {
  if (!payload || typeof payload !== "object") return;

  const nextMessages = extractMessages(payload as Record<string, unknown>);
  if (!nextMessages.length) return;

  startTransition(() => {
    setMessages(nextMessages);
    setItinerary(extractItineraryFromMessages(nextMessages));
    setLatestFlightSearch(extractLatestFlightSearch(nextMessages));
  });
}
