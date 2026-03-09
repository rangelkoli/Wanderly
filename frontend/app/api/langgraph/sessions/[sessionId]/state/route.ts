import { getLangGraphApiUrl } from "@/lib/langgraph";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  const response = await fetch(
    `${getLangGraphApiUrl()}/threads/${encodeURIComponent(sessionId)}/state`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
