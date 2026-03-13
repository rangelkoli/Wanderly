"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  getPreferredAudioMimeType,
  getSpeechRecognitionConstructor,
  transcribeVoiceAudio,
} from "@/lib/voice";

type Mode = "form" | "chat";

const VOICE_MAX_DURATION_SECONDS = 20;
const QUICK_PROMPTS = [
  "Plan a 5-day trip to Tokyo on a budget",
  "I want a weekend beach trip in Bali with nightlife",
  "Family-friendly trip in Europe with museums",
];

function formatSeconds(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}

function formatVoiceStatus(
  isRecording: boolean,
  isTranscribing: boolean,
  seconds: number,
) {
  if (isTranscribing) return "Listening captured, transcribing now";
  if (isRecording) {
    return `Listening live · ${formatSeconds(seconds)} • keep speaking naturally`;
  }
  return "You can speak naturally or type your trip idea";
}

export function HeroChat() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("chat");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [listeningSeconds, setListeningSeconds] = useState(0);
  const recognitionRef = useRef<unknown>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const speechAbortRef = useRef<AbortController | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/langgraph/threads", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { thread_id?: string; id?: string }
        | null;

      if (!response.ok) {
        throw new Error("Unable to create a new session.");
      }

      const threadId = payload?.thread_id ?? payload?.id;
      if (!threadId) {
        throw new Error("Could not create session.");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(`wanderly_prompt_${threadId}`, prompt.trim());
      }

      router.push(`/sessions/${encodeURIComponent(threadId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function startRecordingTimer() {
    clearRecordingTimer();
    setListeningSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setListeningSeconds((current) => {
        const next = current + 1;
        if (next >= VOICE_MAX_DURATION_SECONDS) {
          stopVoiceCapture();
          return current;
        }
        return next;
      });
    }, 1000);
  }

  function stopVoiceCapture() {
    const active = recognitionRef.current as
      | { stop: () => void }
      | null
      | undefined;
    active?.stop();
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    recognitionRef.current = null;
    mediaChunksRef.current = [];
    setIsTranscribing(false);
    setIsRecording(false);
    setListeningSeconds(0);
    clearRecordingTimer();
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
  }

  async function startFallbackVoiceCapture() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone recording is unavailable in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError(
        "Voice recording requires a browser that supports audio recording.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstart = () => {
        setIsRecording(true);
        startRecordingTimer();
      };
      recorder.onstop = async () => {
        const voiceBlob = new Blob(mediaChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        mediaChunksRef.current = [];
        clearRecordingTimer();

        if (!voiceBlob.size) {
          stopVoiceCapture();
          setError("No voice was captured.");
          return;
        }

        const abortController = new AbortController();
        speechAbortRef.current = abortController;
        setIsTranscribing(true);
        try {
          const transcript = await transcribeVoiceAudio(
            voiceBlob,
            abortController.signal,
          );
          if (transcript) {
            setPrompt(transcript);
            setError(null);
          } else {
            setError("Could not detect a clear message.");
          }
        } catch (voiceError) {
          if (!abortController.signal.aborted) {
            setError(
              voiceError instanceof Error
                ? voiceError.message
                : "Unable to transcribe your voice.",
            );
          }
        } finally {
          speechAbortRef.current = null;
          setIsTranscribing(false);
          stopVoiceCapture();
        }
      };
      recorder.onerror = () => {
        setError("Voice recording failed.");
        stopVoiceCapture();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (recordError) {
      setError(
        recordError instanceof Error
          ? recordError.message
          : "Microphone access failed.",
      );
      stopVoiceCapture();
    }
  }

  function startVoiceCapture() {
    if (isLoading) return;

    if (isRecording || isTranscribing) {
      stopVoiceCapture();
      return;
    }

    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      void startFallbackVoiceCapture();
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: unknown) => {
      const speechEvent = event as {
        resultIndex: number;
        results: Array<
          [
            {
              transcript: string;
            },
          ]
        >;
      };
      const index =
        speechEvent.resultIndex ??
        (speechEvent.results?.length ? speechEvent.results.length - 1 : 0);
      const transcript = speechEvent.results?.[index]?.[0]?.transcript?.trim();
      if (transcript) {
        setPrompt(transcript);
      }
      stopVoiceCapture();
    };

    recognition.onerror = () => {
      setError("Voice input failed. Tap again to retry.");
      void startFallbackVoiceCapture();
      stopVoiceCapture();
    };
    recognition.onstart = () => {
      setIsRecording(true);
      startRecordingTimer();
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      clearRecordingTimer();
      setListeningSeconds(0);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (recognitionError) {
      stopVoiceCapture();
      setError(
        recognitionError instanceof Error
          ? recognitionError.message
          : "Unable to start voice input.",
      );
    }
  }

  useEffect(() => {
    return () => {
      stopVoiceCapture();
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative rounded-[22px] bg-gradient-to-r from-[#d66b2d] via-[#1c7c7d] to-[#d66b2d] p-[2px] animate-border-gradient">
        <div className="relative overflow-hidden rounded-[20px] bg-white/90 shadow-xl shadow-[#1f2937]/4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[#1f2937]/5 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#1c7c7d]/60" />
              <span className="text-xs font-medium text-[#5f6b7a]">
                {mode === "chat" ? "Describe your trip" : "Fill in details"}
              </span>
            </div>

            <div className="flex overflow-hidden rounded-lg border border-[#1f2937]/10 bg-[#f6efe4]/60">
              <button
                className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  mode === "form"
                    ? "bg-white text-[#1f2937] shadow-sm"
                    : "text-[#5f6b7a] hover:text-[#1f2937]"
                }`}
                onClick={() => setMode("form")}
                type="button"
              >
                Form
              </button>
              <button
                className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  mode === "chat"
                    ? "bg-white text-[#1f2937] shadow-sm"
                    : "text-[#5f6b7a] hover:text-[#1f2937]"
                }`}
                onClick={() => setMode("chat")}
                type="button"
              >
                Chat
              </button>
            </div>
          </div>

            <div className="p-4">
            {mode === "chat" ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-[#1f2937]/10 bg-[#fff8ee]/65 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#5f6b7a]">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f2937]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isRecording
                            ? "animate-pulse bg-[#d66b2d]"
                            : isTranscribing
                              ? "animate-pulse bg-[#1c7c7d]"
                              : "bg-[#1c7c7d]/40"
                        }`}
                      />
                      Journey Voice
                    </span>
                    <span className="text-[11px] text-[#5f6b7a]/90">
                      {formatVoiceStatus(isRecording, isTranscribing, listeningSeconds)}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-[#1f2937]/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r from-[#d66b2d] via-[#ff9d64] to-[#1c7c7d] transition-[width] duration-300 ${
                        isRecording ? "opacity-100" : "opacity-40"
                      }`}
                      style={{ width: `${Math.min((listeningSeconds / VOICE_MAX_DURATION_SECONDS) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <textarea
                  className="w-full resize-none rounded-lg bg-transparent text-sm leading-relaxed text-[#1f2937] outline-none placeholder:text-[#5f6b7a]/50"
                  disabled={isLoading || isTranscribing}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="I want to spend 5 days exploring the temples and street food of Bangkok..."
                  rows={4}
                  value={prompt}
                />
                <div className="text-xs font-semibold text-[#5f6b7a]">
                  Inspiration cards
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((quickPrompt) => (
                    <button
                      className="rounded-full border border-[#1f2937]/10 bg-[#f6efe4]/90 px-3 py-1.5 text-xs text-[#5f6b7a] transition hover:border-[#d66b2d]/40 hover:bg-white hover:text-[#1c7c7d]"
                      key={quickPrompt}
                      onClick={() => setPrompt(quickPrompt)}
                      type="button"
                    >
                      {quickPrompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5f6b7a]">
                    Destination
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                    onChange={(e) =>
                      setPrompt((prev) => {
                        const parts = prev.split(" | ");
                        parts[0] = e.target.value;
                        return parts.filter(Boolean).join(" | ");
                      })
                    }
                    placeholder="Tokyo, Japan"
                    type="text"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5f6b7a]">
                    Duration
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                    placeholder="5 days"
                    type="text"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5f6b7a]">
                    Budget
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                    placeholder="$2,000"
                    type="text"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5f6b7a]">
                    Interests
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#1f2937]/8 bg-[#f6efe4]/40 px-3 py-2 text-sm text-[#1f2937] outline-none transition-colors placeholder:text-[#5f6b7a]/40 focus:border-[#d66b2d]/40"
                    placeholder="Food, temples, nightlife"
                    type="text"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#1f2937]/5 px-4 py-3">
            <div className="text-xs text-[#5f6b7a]/60">
              {error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                <span>
                  {mode === "chat"
                    ? isTranscribing
                      ? "Transcribing your voice..."
                      : isRecording
                        ? `Listening... ${formatSeconds(listeningSeconds)}`
                        : formatVoiceStatus(isRecording, isTranscribing, listeningSeconds)
                    : "Fill in the form and press Plan my trip"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {mode === "chat" && (
                <button
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all ${
                    isRecording
                      ? "bg-[#e74c3c] text-white"
                      : "bg-[#1c7c7d] text-white hover:bg-[#166567]"
                  }`}
                  disabled={isLoading}
                  onClick={() => startVoiceCapture()}
                  type="button"
                  aria-label="Use voice mode"
                >
                  {isRecording && (
                    <span
                      className='inline-flex items-center gap-0.5'
                      aria-hidden="true"
                    >
                      <span className="h-1.5 w-1 rounded-full bg-[#fff8ee] animate-pulse delay-75" />
                      <span className="h-1.5 w-1 rounded-full bg-[#fff8ee] animate-pulse" />
                      <span className="h-1.5 w-1 rounded-full bg-[#fff8ee] animate-pulse delay-150" />
                    </span>
                  )}
                  {isTranscribing
                    ? "Transcribing..."
                    : isRecording
                      ? "Stop voice"
                      : "🎤 Voice"}
                </button>
              )}
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#d66b2d] px-4 text-xs font-semibold text-[#fff8ee] transition-all hover:bg-[#c05a24] hover:shadow-lg hover:shadow-[#d66b2d]/20 disabled:opacity-50"
                disabled={isLoading || isTranscribing || !prompt.trim()}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    Plan my trip
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
