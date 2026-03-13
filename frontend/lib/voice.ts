export type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | null {
  if (typeof window === "undefined") return null;

  const speechAware = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return (
    speechAware.SpeechRecognition ?? speechAware.webkitSpeechRecognition ?? null
  );
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export function getPreferredAudioMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined")
    return undefined;

  for (const mimeType of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return undefined;
}

type VoiceTranscriptionResponse = {
  text: string;
  provider?: string;
  model?: string;
};

export async function transcribeVoiceAudio(
  audioBlob: Blob,
  signal?: AbortSignal,
): Promise<string> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("No audio was captured.");
  }

  const formData = new FormData();
  formData.append(
    "audio",
    audioBlob,
    `voice-input.${(audioBlob.type || "webm").split("/").at(-1) || "webm"}`,
  );

  const response = await fetch("/api/voice/transcribe", {
    method: "POST",
    body: formData,
    signal,
  });

  const payload = (await response
    .json()
    .catch(() => null)) as (VoiceTranscriptionResponse & { error?: string }) | null;

  if (!response.ok || !payload) {
    throw new Error(
      payload?.error ??
        `Unable to transcribe voice. Service returned ${response.status}.`,
    );
  }

  if (!payload.text || typeof payload.text !== "string") {
    throw new Error("Transcription service returned no text.");
  }

  return payload.text.trim();
}
