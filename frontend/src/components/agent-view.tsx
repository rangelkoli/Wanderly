"use client";

import { useStream } from "@langchain/langgraph-sdk/react";
import { CheckIcon, GlobeIcon, MicIcon } from "lucide-react";
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ReelsList } from "@/components/reel-embed";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import QuestionCard, { type AskHumanAnswersPayload, type AskHumanQuestion } from "./human-tool-call";
import PlaceSelectionCard, { type PlaceSelectionPayload, type PlaceOption } from "./place-selection-card";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Persona, type PersonaState } from "./ai-elements/persona";

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

interface AgentViewProps {
  onSessionCreated?: (sessionId: string) => void;
}

function determineAgentState(
  stream: ReturnType<typeof useStream>,
  interruptUi:
    | { kind: "ask-single"; question: string; choices: string[] }
    | { kind: "ask-multi"; questions: AskHumanQuestion[] }
    | { kind: "select-places"; prompt: string; places: PlaceOption[] }
    | null
): PersonaState {
  if (interruptUi) {
    return "listening";
  }

  const hasToolMessages = stream.messages.some((msg) => msg.type === "tool");
  const latestMessage = stream.messages[stream.messages.length - 1];
  const isLatestMessageFromAssistant = latestMessage?.type === "ai";
  
  if (stream.isLoading && hasToolMessages) {
    return "thinking";
  }
  
  if (stream.isLoading && isLatestMessageFromAssistant) {
    return "speaking";
  }
  
  if (stream.isLoading) {
    return "thinking";
  }

  return "idle";
}

export function AgentView({ onSessionCreated }: AgentViewProps) {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();

  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [createdThreadId, setCreatedThreadId] = useState<string | undefined>(undefined);
  const [hasSentMessage, setHasSentMessage] = useState(false);

  const existingSession = useQuery(
    api.sessions.get,
    urlSessionId ? { sessionId: urlSessionId as any } : "skip"
  );

  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);

  const threadId = useMemo(() => {
    return existingSession?.threadId ?? createdThreadId;
  }, [existingSession?.threadId, createdThreadId]);

  const currentSessionId = useMemo(() => {
    return existingSession?._id ?? urlSessionId;
  }, [existingSession?._id, urlSessionId]);

  const hasCreatedSessionRef = useRef(false);

  const stream = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
    threadId,
    onThreadId: (newThreadId) => {
      if (!newThreadId || !UUID_REGEX.test(newThreadId)) {
        return;
      }
      setCreatedThreadId(newThreadId);
      if (!hasCreatedSessionRef.current && newThreadId && !urlSessionId) {
        hasCreatedSessionRef.current = true;
        void createSession({
          threadId: newThreadId,
          title: "New Chat",
        }).then((newSessionId) => {
          onSessionCreated?.(newSessionId as string);
        });
      }
    },
  });

  useEffect(() => {
    if (stream.messages.length > 0) {
      setHasSentMessage(true);
    }
  }, [stream.messages.length]);

  const selectedModelData = models.find((m) => m.id === model);

  const interruptUi = useMemo(() => {
    const interruptedTask = stream.interrupt;
    
    if (interruptedTask) {
      const interrupt = interruptedTask as any;
      const val = interrupt.value;
      if (val && typeof val === "object") {
        if ((val as any).type === "select_places" && Array.isArray((val as any).places)) {
          return {
            kind: "select-places" as const,
            prompt: (val as any).prompt || "Select places to include in your itinerary",
            places: (val as any).places as PlaceOption[],
            minSelect: (val as any).min_select,
            maxSelect: (val as any).max_select,
          };
        }
        if (Array.isArray((val as any).questions) && (val as any).questions.length) {
          return {
            kind: "ask-multi" as const,
            questions: (val as any).questions as AskHumanQuestion[],
          };
        }
        if ((val as any).question) {
          return {
            kind: "ask-single" as const,
            question: (val as any).question,
            choices: (val as any).choices || [],
          };
        }
      }
    }
    return null;
  }, [stream.interrupt]);

  const personaState = determineAgentState(stream, interruptUi as any);

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    setText("");

    if (message.files?.length) {
      toast.success("Files attached", {
        description: `${message.files.length} file(s) attached to message`,
      });
    }

    if (currentSessionId && message.text) {
      const title = message.text.slice(0, 50) + (message.text.length > 50 ? "..." : "");
      await updateSession({ sessionId: currentSessionId as any, title });
    }

    await stream.submit({
      messages: [{ content: message.text, type: "human" }],
    });
  };

  const handleInterruptSubmit = useCallback(async (answer: string | AskHumanAnswersPayload | PlaceSelectionPayload) => {
    try {
      await stream.submit(null, {
        command: {
          resume: answer,
        },
      });
    } catch (error) {
      console.error("Failed to resume stream:", error);
      toast.error("Failed to send answer");
    }
  }, [stream]);

  const activityLabel = useMemo(() => {
    if (interruptUi) return "Waiting for your answer...";
    if (stream.isLoading) {
      const hasToolMessages = stream.messages.some((msg) => msg.type === "tool");
      if (hasToolMessages) return "Using tools...";
      return "Thinking...";
    }
    return "Ready to help";
  }, [stream.isLoading, stream.messages, interruptUi]);

  const visibleMessages = useMemo(() => {
    return stream.messages.filter((msg) => msg.type !== "tool");
  }, [stream.messages]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gradient-to-b from-background via-background to-accent/5">
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <motion.div 
          className="flex flex-col items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <Persona 
              state={personaState} 
              variant="obsidian" 
              className="w-32 h-32 md:w-48 md:h-48"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={activityLabel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <span className="text-sm text-muted-foreground font-medium">
                  {activityLabel}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {!hasSentMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h2 className="text-xl font-semibold mb-2">What can I help you with?</h2>
              <p className="text-muted-foreground text-sm">
                Ask me anything or describe what you'd like to create
              </p>
            </motion.div>
          )}
        </motion.div>

        {visibleMessages.length > 0 && (
          <motion.div 
            className="w-full max-w-2xl mt-8 space-y-4 max-h-[40vh] overflow-y-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {visibleMessages.map((msg, index) => {
              const isUser = msg.type === "human";
              const content = Array.isArray(msg.content)
                ? msg.content
                    .map((c: any) => c.text || c.content || JSON.stringify(c))
                    .join("")
                : msg.content || "";

              const instagramRegex =
                /https:\/\/www\.instagram\.com\/reel\/[a-zA-Z0-9_-]+\/?/g;
              const parts = content.split(instagramRegex);
              const instagramLinks = content.match(instagramRegex) || [];

              const renderContent: React.ReactNode[] = [];
              let currentReelGroup: string[] = [];

              const flushReelGroup = () => {
                if (currentReelGroup.length > 0) {
                  renderContent.push(
                    <ReelsList key={`reels-${renderContent.length}`} urls={currentReelGroup} />
                  );
                  currentReelGroup = [];
                }
              };

              parts.forEach((part, idx) => {
                const trimmedPart = part.trim();
                const reelUrl = instagramLinks[idx];

                if (trimmedPart) {
                  flushReelGroup();
                  renderContent.push(
                    <MessageResponse key={`text-${idx}`}>{trimmedPart}</MessageResponse>
                  );
                }

                if (reelUrl) {
                  currentReelGroup.push(reelUrl);
                }
              });

              flushReelGroup();

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Message from={isUser ? "user" : "assistant"}>
                    <MessageContent>
                      {renderContent}
                    </MessageContent>
                  </Message>
                </motion.div>
              );
            })}
            {stream.isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Message from="assistant">
                  <MessageContent>
                    <MessageResponse className="text-muted-foreground">Thinking...</MessageResponse>
                  </MessageContent>
                </Message>
              </motion.div>
            )}
            {interruptUi?.kind === "ask-single" || interruptUi?.kind === "ask-multi" ? (
              <QuestionCard
                question={interruptUi.kind === "ask-single" ? interruptUi.question : undefined}
                choices={interruptUi.kind === "ask-single" ? interruptUi.choices : undefined}
                questions={interruptUi.kind === "ask-multi" ? interruptUi.questions : undefined}
                onAnswer={(answer) => void handleInterruptSubmit(answer)}
              />
            ) : null}
            {interruptUi?.kind === "select-places" ? (
              <PlaceSelectionCard
                prompt={interruptUi.prompt}
                places={interruptUi.places}
                minSelect={(interruptUi as any).minSelect}
                maxSelect={(interruptUi as any).maxSelect}
                onSubmit={(payload) => void handleInterruptSubmit(payload)}
              />
            ) : null}
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setText(event.target.value)}
                value={text}
                placeholder="Describe what you'd like to create..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  onClick={() => setUseMicrophone(!useMicrophone)}
                  variant={useMicrophone ? "default" : "ghost"}
                >
                  <MicIcon size={16} />
                  <span className="sr-only">Microphone</span>
                </PromptInputButton>
                <PromptInputButton
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {["OpenAI", "Anthropic", "Google"].map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {models
                            .filter((m) => m.chef === chef)
                            .map((m) => (
                              <ModelSelectorItem
                                key={m.id}
                                onSelect={() => {
                                  setModel(m.id);
                                  setModelSelectorOpen(false);
                                }}
                                value={m.id}
                              >
                                <ModelSelectorLogo provider={m.chefSlug} />
                                <ModelSelectorName>{m.name}</ModelSelectorName>
                                <ModelSelectorLogoGroup>
                                  {m.providers.map((provider) => (
                                    <ModelSelectorLogo
                                      key={provider}
                                      provider={provider}
                                    />
                                  ))}
                                </ModelSelectorLogoGroup>
                                {model === m.id ? (
                                  <CheckIcon className="ml-auto size-4" />
                                ) : (
                                  <div className="ml-auto size-4" />
                                )}
                              </ModelSelectorItem>
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!text.trim() || stream.isLoading}
                status={stream.isLoading ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export default AgentView;
