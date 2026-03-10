import type { FlightOption } from "@/lib/langgraph";

export type StreamEventRecord = {
  id: string;
  event: string;
  receivedAt: string;
  data: unknown;
  preview: string;
};

export type FlightSummaryDetails = Pick<
  FlightOption,
  | "airline"
  | "departure_airport"
  | "arrival_airport"
  | "departure_time"
  | "arrival_time"
  | "duration"
  | "stops"
>;
