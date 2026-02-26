"use client";
import { useStream } from "@langchain/langgraph-sdk/react";

import { CheckIcon, GlobeIcon, MicIcon } from "lucide-react";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useParams } from "react-router";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";
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

interface ChatProps {
  onSessionCreated?: (sessionId: string) => void;
}

export function Chat({ onSessionCreated }: ChatProps) {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();

  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [createdThreadId, setCreatedThreadId] = useState<string | undefined>(undefined);

  const existingSession = useQuery(
    api.sessions.get,
    urlSessionId ? { sessionId: urlSessionId as any } : "skip"
  );

  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);

  const threadId = useMemo(() => {
    return existingSession?.threadId ?? createdThreadId;
  }, [existingSession?.threadId, createdThreadId]);

  const validThreadId = useMemo(() => {
    return threadId && UUID_REGEX.test(threadId) ? threadId : undefined;
  }, [threadId]);

  const currentSessionId = useMemo(() => {
    return existingSession?._id ?? urlSessionId;
  }, [existingSession?._id, urlSessionId]);

  const hasCreatedSessionRef = useRef(false);

  const stream = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
    threadId: validThreadId,
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

  const selectedModelData = models.find((m) => m.id === model);

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
  console.log("Stream status:", stream.messages);

  const interruptUi = useMemo<(
    | { kind: "ask-single"; question: string; choices: string[] }
    | { kind: "ask-multi"; questions: AskHumanQuestion[] }
    | { kind: "select-places"; prompt: string; places: PlaceOption[]; minSelect?: number; maxSelect?: number | null }
    | null
  )>(() => {
    const interruptedTask = stream.interrupt;
    console.log("Interrupted task:", interruptedTask);
    
    if (interruptedTask) {
      const interrupt = interruptedTask as any;
      const val = interrupt.value;
      if (val && typeof val === "object") {
        if (val.type === "select_places" && Array.isArray(val.places)) {
          return {
            kind: "select-places",
            prompt: val.prompt || "Select places to include in your itinerary",
            places: val.places as PlaceOption[],
            minSelect: val.min_select,
            maxSelect: val.max_select,
          };
        }
        if (Array.isArray(val.questions) && val.questions.length) {
          return { kind: "ask-multi", questions: val.questions as AskHumanQuestion[] };
        }
        if (val.question) {
          return {
            kind: "ask-single",
            question: val.question,
            choices: val.choices || [],
          };
        }
      }
    }
    return null;
  }, [stream.interrupt]);

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



  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Conversation className="min-h-0 flex-1 border-b">
        <ConversationContent>
          {stream.messages.map((msg) => {
            const isUser = msg.type === "human";

            if (msg.type === "tool") {
              const toolContent = msg.content as string;
              return (
                <Message key={msg.id} from="tool">
                  <Tool>
                    <ToolHeader
                      title={msg.name || "Tool"}
                      type="tool-invocation"
                      state={
                        msg.status === "error"
                          ? "output-error"
                          : "output-available"
                      }
                    />
                    <ToolContent>
                      <ToolOutput
                        output={toolContent}
                        errorText={
                          msg.status === "error" ? toolContent : undefined
                        }
                      />
                    </ToolContent>
                  </Tool>
                </Message>
              );
            }

            const content = Array.isArray(msg.content)
              ? msg.content
                  .map((c: any) => c.text || c.content || JSON.stringify(c))
                  .join("")
              : msg.content || "";

            const instagramRegex =
              /https:\/\/www\.instagram\.com\/reel\/[a-zA-Z0-9_-]+\/?/g;
            const parts = content.split(instagramRegex);
            const instagramLinks =
              content.match(instagramRegex) || [];

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

            parts.forEach((part, index) => {
              const trimmedPart = part.trim();
              const reelUrl = instagramLinks[index];

              if (trimmedPart) {
                flushReelGroup();
                renderContent.push(
                  <MessageResponse key={`text-${index}`}>{trimmedPart}</MessageResponse>
                );
              }

              if (reelUrl) {
                currentReelGroup.push(reelUrl);
              }
            });

            flushReelGroup();

            return (
              <Message key={msg.id} from={isUser ? "user" : "assistant"}>
                <MessageContent>
                  {renderContent}
                </MessageContent>
              </Message>
            );
          })}
          {stream.isLoading ? (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>Thinking...</MessageResponse>
              </MessageContent>
            </Message>
          ) : null}
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
              minSelect={interruptUi.minSelect}
              maxSelect={interruptUi.maxSelect}
              onSubmit={(payload) => void handleInterruptSubmit(payload)}
            />
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 space-y-4 pt-4">
        <div className="w-full px-4 pb-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setText(event.target.value)}
                value={text}
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

export default Chat;
