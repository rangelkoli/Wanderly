const DEFAULT_LANGGRAPH_API_URL = "http://127.0.0.1:2024";
const DEFAULT_ASSISTANT_ID = "agent";

export type LangGraphStateResponse = {
  values?: Record<string, unknown>;
  next?: string[];
  checkpoint?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tasks?: unknown[];
  __interrupt__?: unknown[];
};

export type SessionMessage = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  name?: string | null;
  toolCalls?: Array<{
    id?: string;
    name?: string;
    args?: unknown;
  }>;
};

export type FlightSearchPayload = {
  type: "select_flight" | "no_flights_found";
  prompt?: string;
  message?: string;
  flightOptions: FlightOption[];
  searchParams?: Record<string, unknown>;
  priceInfo?: Record<string, unknown>;
};

export type InterruptQuestion = {
  id: string;
  question: string;
  choices: string[];
};

export type FlightOption = {
  option_id: number;
  price?: number;
  airline?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_time?: string;
  arrival_time?: string;
  arrival_time_ahead?: string;
  duration?: string;
  stops?: number;
  cabin?: string;
  is_best?: boolean;
  delay?: string;
  price_level?: string;
};

export type SessionInterrupt = {
  id: string;
  resumable: boolean;
  when?: string;
  ns?: string[];
  value: unknown;
  questions: InterruptQuestion[];
  prompt?: string;
  flightOptions: FlightOption[];
  searchParams?: Record<string, unknown>;
  priceInfo?: Record<string, unknown>;
  kind: "ask_human" | "select_flight" | "unknown";
};

export type ItineraryItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  start_time: string;
  end_time: string;
  image_url: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type ItinerarySession = {
  label: string;
  transfer_note?: string;
  items: ItineraryItem[];
};

export type ItineraryDay = {
  day_number: number;
  title: string;
  date_label: string;
  activities_count: number;
  budget_label: string;
  sessions: ItinerarySession[];
  route?: {
    distance_km?: number;
    duration_min?: number;
    map_image_url?: string;
  };
};

export type ItineraryPayload = {
  itinerary_title: string;
  destination: string;
  days: ItineraryDay[];
  sources: string[];
  selected_flight?: {
    option_id?: number;
    airline?: string;
    price?: number;
    departure_airport?: string;
    arrival_airport?: string;
    departure_time?: string;
    arrival_time?: string;
    duration?: string;
    stops?: number;
    cabin?: string;
  };
};

function withoutTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getLangGraphApiUrl() {
  const configured =
    process.env.LANGGRAPH_API_URL ?? process.env.NEXT_PUBLIC_LANGGRAPH_API_URL;

  return withoutTrailingSlash(configured || DEFAULT_LANGGRAPH_API_URL);
}

export function getLangGraphAssistantId() {
  return process.env.LANGGRAPH_ASSISTANT_ID ?? DEFAULT_ASSISTANT_ID;
}

export function getSessionStateApiPath(sessionId: string) {
  return `/api/langgraph/sessions/${encodeURIComponent(sessionId)}/state`;
}

export function getSessionStreamApiPath(sessionId: string) {
  return `/api/langgraph/sessions/${encodeURIComponent(sessionId)}/stream`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeQuestion(raw: unknown, index: number): InterruptQuestion | null {
  const question = asRecord(raw);
  if (!question || typeof question.question !== "string") {
    return null;
  }

  return {
    id:
      typeof question.id === "string" && question.id.trim()
        ? question.id
        : `q${index + 1}`,
    question: question.question,
    choices: Array.isArray(question.choices)
      ? question.choices.filter((choice): choice is string => typeof choice === "string")
      : [],
  };
}

function extractQuestionsFromInterruptValue(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  if (Array.isArray(record.questions)) {
    return record.questions
      .map((question, index) => normalizeQuestion(question, index))
      .filter((question): question is InterruptQuestion => question !== null);
  }

  if (typeof record.question === "string") {
    return [
      {
        id: "q1",
        question: record.question,
        choices: Array.isArray(record.choices)
          ? record.choices.filter(
              (choice): choice is string => typeof choice === "string",
            )
          : [],
      },
    ];
  }

  return [];
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeFlightOption(raw: unknown): FlightOption | null {
  const option = asRecord(raw);
  if (!option) {
    return null;
  }

  const optionId = parseInteger(option.option_id);
  if (typeof optionId !== "number") {
    return null;
  }

  return {
    option_id: optionId,
    price: parseInteger(option.price),
    airline: typeof option.airline === "string" ? option.airline : undefined,
    departure_airport:
      typeof option.departure_airport === "string"
        ? option.departure_airport
        : undefined,
    arrival_airport:
      typeof option.arrival_airport === "string"
        ? option.arrival_airport
        : undefined,
    departure_time:
      typeof option.departure_time === "string"
        ? option.departure_time
        : undefined,
    arrival_time:
      typeof option.arrival_time === "string" ? option.arrival_time : undefined,
    arrival_time_ahead:
      typeof option.arrival_time_ahead === "string"
        ? option.arrival_time_ahead
        : undefined,
    duration: typeof option.duration === "string" ? option.duration : undefined,
    stops: parseInteger(option.stops),
    cabin: typeof option.cabin === "string" ? option.cabin : undefined,
    is_best:
      typeof option.is_best === "boolean" ? option.is_best : undefined,
    delay: typeof option.delay === "string" ? option.delay : undefined,
    price_level:
      typeof option.price_level === "string" ? option.price_level : undefined,
  };
}

function normalizeFlightSearchPayload(value: unknown): FlightSearchPayload | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const flightOptions = Array.isArray(record.flight_options)
    ? record.flight_options
        .map((option) => normalizeFlightOption(option))
        .filter((option): option is FlightOption => option !== null)
    : Array.isArray(record.flights)
      ? record.flights
          .map((option) => normalizeFlightOption(option))
          .filter((option): option is FlightOption => option !== null)
      : [];

  if (record.type === "select_flight" && flightOptions.length) {
    return {
      type: "select_flight",
      prompt: typeof record.prompt === "string" ? record.prompt : undefined,
      flightOptions,
      searchParams: asRecord(record.search_params) ?? undefined,
      priceInfo: asRecord(record.price_info) ?? undefined,
    };
  }

  if (record.type === "no_flights_found") {
    return {
      type: "no_flights_found",
      message: typeof record.message === "string" ? record.message : undefined,
      flightOptions: [],
      searchParams:
        asRecord(record.search_params) ??
        asRecord(record.search_parameters) ??
        undefined,
    };
  }

  return null;
}

function normalizeInterrupt(rawInterrupt: unknown, index: number): SessionInterrupt | null {
  const interrupt = asRecord(rawInterrupt);
  if (!interrupt) {
    return null;
  }

  const value = "value" in interrupt ? interrupt.value : rawInterrupt;
  const valueRecord = asRecord(value);
  const questions = extractQuestionsFromInterruptValue(value);
  const flightPayload = normalizeFlightSearchPayload(value);
  const flightOptions = flightPayload?.flightOptions ?? [];

  let kind: SessionInterrupt["kind"] = "unknown";
  if (questions.length) {
    kind = "ask_human";
  } else if (flightPayload?.type === "select_flight" && flightOptions.length) {
    kind = "select_flight";
  }

  return {
    id:
      Array.isArray(interrupt.ns) && typeof interrupt.ns[0] === "string"
        ? interrupt.ns[0]
        : `interrupt-${index}`,
    resumable: interrupt.resumable !== false,
    when: typeof interrupt.when === "string" ? interrupt.when : undefined,
    ns: Array.isArray(interrupt.ns)
      ? interrupt.ns.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    value,
    questions,
    prompt: flightPayload?.prompt ?? (typeof valueRecord?.prompt === "string" ? valueRecord.prompt : undefined),
    flightOptions,
    searchParams: flightPayload?.searchParams,
    priceInfo: flightPayload?.priceInfo,
    kind,
  };
}

function getMessageRole(type: string | undefined) {
  switch (type) {
    case "human":
      return "user";
    case "ai":
      return "assistant";
    case "tool":
      return "tool";
    default:
      return "system";
  }
}

function stringifyContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }

        const record = asRecord(entry);
        if (!record) {
          return "";
        }

        if (typeof record.text === "string") {
          return record.text;
        }

        if (typeof record.content === "string") {
          return record.content;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (content == null) {
    return "";
  }

  return JSON.stringify(content, null, 2);
}

export function normalizeMessage(
  rawMessage: unknown,
  index: number,
): SessionMessage | null {
  const message = asRecord(rawMessage);
  if (!message) {
    return null;
  }

  const role = getMessageRole(
    typeof message.type === "string" ? message.type : undefined,
  );

  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls
        .map((call) => {
          const toolCall = asRecord(call);
          if (!toolCall) {
            return null;
          }

          return {
            id: typeof toolCall.id === "string" ? toolCall.id : undefined,
            name:
              typeof toolCall.name === "string" ? toolCall.name : undefined,
            args: toolCall.args,
          };
        })
        .filter((call): call is NonNullable<typeof call> => call !== null)
    : undefined;

  return {
    id:
      typeof message.id === "string"
        ? message.id
        : `message-${index}-${role}`,
    role,
    content: stringifyContent(message.content),
    name: typeof message.name === "string" ? message.name : null,
    toolCalls,
  };
}

export function extractMessages(
  payload: LangGraphStateResponse | Record<string, unknown> | null | undefined,
) {
  const source = payload && "values" in payload ? payload.values : payload;
  const record = asRecord(source);
  const messages = Array.isArray(record?.messages) ? record.messages : [];

  return messages
    .map((message, index) => normalizeMessage(message, index))
    .filter((message): message is SessionMessage => message !== null);
}

function looksLikeItinerary(value: unknown): value is ItineraryPayload {
  const record = asRecord(value);
  return Boolean(
    record &&
      typeof record.itinerary_title === "string" &&
      typeof record.destination === "string" &&
      Array.isArray(record.days),
  );
}

export function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function extractItineraryFromMessages(messages: SessionMessage[]) {
  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") {
      continue;
    }

    const parsed = tryParseJson(message.content);
    if (looksLikeItinerary(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function extractInterrupts(
  payload: LangGraphStateResponse | Record<string, unknown> | null | undefined,
) {
  const candidates: unknown[] = [];
  const root = payload as Record<string, unknown> | null | undefined;
  const values =
    root && "values" in root && root.values && typeof root.values === "object"
      ? (root.values as Record<string, unknown>)
      : null;

  if (Array.isArray(root?.__interrupt__)) {
    candidates.push(...root.__interrupt__);
  }

  if (Array.isArray(values?.__interrupt__)) {
    candidates.push(...values.__interrupt__);
  }

  if (Array.isArray(root?.tasks)) {
    for (const task of root.tasks) {
      const taskRecord = asRecord(task);
      if (!taskRecord) {
        continue;
      }

      if (Array.isArray(taskRecord.interrupts)) {
        candidates.push(...taskRecord.interrupts);
      }
    }
  }

  return candidates
    .map((interrupt, index) => normalizeInterrupt(interrupt, index))
    .filter(
      (interrupt): interrupt is SessionInterrupt =>
        interrupt !== null && interrupt.resumable,
    );
}

export function extractLatestFlightSearch(messages: SessionMessage[]) {
  for (const message of [...messages].reverse()) {
    if (message.role !== "tool" || message.name !== "flights_finder") {
      continue;
    }

    const parsed = tryParseJson(message.content);
    const flightPayload = normalizeFlightSearchPayload(parsed);
    if (flightPayload) {
      return flightPayload;
    }
  }

  return null;
}

export function describeEventData(data: unknown) {
  if (typeof data === "string") {
    return data.slice(0, 140);
  }

  if (Array.isArray(data)) {
    return `Array(${data.length})`;
  }

  const record = asRecord(data);
  if (!record) {
    return "No payload";
  }

  if (Array.isArray(record.messages)) {
    return `${record.messages.length} messages`;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  return Object.keys(record).slice(0, 4).join(", ") || "Object payload";
}
