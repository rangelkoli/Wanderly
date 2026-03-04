/**
 * LangGraph configuration for connecting to the backend agent.
 *
 * The API URL is read from NEXT_PUBLIC_LANGGRAPH_API_URL (defaults to
 * http://localhost:2024 for local dev).  The single assistant exposed by the
 * backend is called "agent".
 */

export const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ?? "http://localhost:2024";

export const LANGGRAPH_ASSISTANT_ID = "agent";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
