"use client";
import { useStream } from "@langchain/langgraph-sdk/react";

import { CheckIcon, GlobeIcon, MicIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
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

// const suggestions = [
//   "What are the latest trends in AI?",
//   "How does machine learning work?",
//   "Explain quantum computing",
//   "Best practices for React development",
//   "Tell me about TypeScript benefits",
//   "How to optimize database queries?",
//   "What is the difference between SQL and NoSQL?",
//   "Explain cloud computing basics",
// ]

const mockResponses = [
  "That's a great question! Let me help you understand this concept better. The key thing to remember is that proper implementation requires careful consideration of the underlying principles and best practices in the field.",
  "I'd be happy to explain this topic in detail. From my understanding, there are several important factors to consider when approaching this problem. Let me break it down step by step for you.",
  "This is an interesting topic that comes up frequently. The solution typically involves understanding the core concepts and applying them in the right context. Here's what I recommend...",
  "Great choice of topic! This is something that many developers encounter. The approach I'd suggest is to start with the fundamentals and then build up to more complex scenarios.",
  "That's definitely worth exploring. From what I can see, the best way to handle this is to consider both the theoretical aspects and practical implementation details.",
];

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

export function Chat() {
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);

  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const stream = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
    threadId,
    onThreadId: setThreadId,
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

    await stream.submit({
      messages: [{ content: message.text, type: "human" }],
    });
  };
  console.log("Stream status:", stream.messages);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-16">
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 space-y-4 pt-4">
        {/* <Suggestions className="px-4">
          {suggestions.map(suggestion => (
            <Suggestion
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              suggestion={suggestion}
            />
          ))}
        </Suggestions> */}
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
