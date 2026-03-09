import { getLangGraphApiUrl, getLangGraphAssistantId } from "@/lib/langgraph";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

type StreamRequestBody = {
  input?: string;
  resume?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as StreamRequestBody;
  const prompt = body.input?.trim();
  const hasResume = Object.prototype.hasOwnProperty.call(body, "resume");

  const upstreamResponse = await fetch(
    `${getLangGraphApiUrl()}/threads/${encodeURIComponent(sessionId)}/runs/stream`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistant_id: getLangGraphAssistantId(),
        command: hasResume
          ? {
              resume: body.resume,
            }
          : undefined,
        input: prompt
          ? {
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
            }
          : undefined,
        stream_mode: ["updates", "values", "messages", "events"],
      }),
      cache: "no-store",
    },
  );

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type":
        upstreamResponse.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
