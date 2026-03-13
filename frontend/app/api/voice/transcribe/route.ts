type TranscribeResponse = {
  text?: string;
  error?: string;
  details?: string;
  provider?: string;
  model?: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!(audioFile instanceof File)) {
      return Response.json(
        {
          error: "Missing audio file.",
        } as TranscribeResponse,
        { status: 400 },
      );
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return Response.json(
        {
          error:
            "Voice transcription is not configured. Please set OPENAI_API_KEY.",
          provider: "openai-whisper",
          model: "whisper-1",
        } as TranscribeResponse,
        { status: 503 },
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("file", audioFile);
    upstreamForm.append("model", "whisper-1");

    const upstreamResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: upstreamForm,
      },
    );

    const payload = (await upstreamResponse
      .json()
      .catch(() => null)) as TranscribeResponse | null;

    if (!upstreamResponse.ok) {
      return Response.json(
        {
          error:
            payload?.error ??
            `Transcription failed with status ${upstreamResponse.status}.`,
          details: JSON.stringify(payload ?? {}),
          provider: "openai-whisper",
          model: "whisper-1",
        } as TranscribeResponse,
        { status: upstreamResponse.status || 502 },
      );
    }

    if (!payload || typeof payload.text !== "string") {
      return Response.json(
        {
          error: "Transcription response did not contain text.",
          provider: "openai-whisper",
          model: "whisper-1",
        } as TranscribeResponse,
        { status: 502 },
      );
    }

    return Response.json(
      {
        text: payload.text,
        provider: "openai-whisper",
        model: "whisper-1",
      } as TranscribeResponse,
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      } as TranscribeResponse,
      { status: 500 },
    );
  }
}
