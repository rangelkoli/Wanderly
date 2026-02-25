"use client";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
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
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import QuestionCard, { type AskHumanAnswersPayload, type AskHumanQuestion } from "./human-tool-call";

const RunningAgent = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const [text, setText] = useState<string>("");
  const [createdThreadId, setCreatedThreadId] = useState<string | null>(null);
  const hasUpdatedSessionRef = useRef(false);

  const existingSession = useQuery(
    api.sessions.get,
    urlSessionId ? { sessionId: urlSessionId as any } : "skip",
  );

  const updateSession = useMutation(api.sessions.update);

  const threadId = useMemo(() => {
    return existingSession?.threadId ?? createdThreadId;
  }, [existingSession?.threadId, createdThreadId]);

  const { submit, messages, isLoading } = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
    threadId,
    onThreadId: (newThreadId) => {
      console.log("onThreadId called with:", newThreadId);
      setCreatedThreadId(newThreadId);

      if (
        !hasUpdatedSessionRef.current &&
        newThreadId &&
        urlSessionId &&
        existingSession
      ) {
        hasUpdatedSessionRef.current = true;
        console.log("Updating session with real threadId:", newThreadId);
        void updateSession({
          sessionId: urlSessionId as any,
          title: "New Chat",
        });
      }
    },
  });

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);

    if (!hasText) {
      return;
    }

    setText("");

    if (currentSessionId && message.text) {
      const title = message.text.slice(0, 50) + (message.text.length > 50 ? "..." : "");
      await updateSession({ sessionId: currentSessionId as any, title });
    }

    await submit({
      messages: [{ content: message.text, type: "human" }],
    });
  };

  const currentSessionId = useMemo(() => {
    return existingSession?._id ?? urlSessionId;
  }, [existingSession?._id, urlSessionId]);

  const askHumanArgs = useMemo<(
    | { kind: "single"; question: string; choices: string[] }
    | { kind: "multi"; questions: AskHumanQuestion[] }
    | null
  )>(() => {
    const interruptedTask = messages;
    
    if (interruptedTask) {
      const interrupt = interruptedTask as any;
      const val = interrupt.value;
      if (val && typeof val === "object") {
        if (Array.isArray((val as any).questions) && (val as any).questions.length) {
          return {
            kind: "multi",
            questions: (val as any).questions as AskHumanQuestion[],
          };
        }
        if (!(val as any).question) return null;
        let choices = val.choices || [];
        
        if (!choices.length && typeof val.question === "string") {
          const choicesMatch = val.question.match(/\(choices:\s*([^)]+)\)/i);
          if (choicesMatch) {
            choices = choicesMatch[1].split(/\s*\/\s*/).map((c: string) => c.trim());
          }
        }
        
        return {
          kind: "single",
          question: val.question.replace(/\(choices:\s*[^)]+\)/gi, "").trim(),
          choices,
        };
      }
    }
    return null;
  }, [messages]);

  const handleAnswer = useCallback(async (answer: string | AskHumanAnswersPayload) => {
    try {
      await submit(null, {
        command: {
          resume: answer,
        },
      });
    } catch (error) {
      console.error("Failed to resume stream:", error);
      toast.error("Failed to send answer");
    }
  }, [submit]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Conversation className="min-h-0 flex-1 border-b">
        <ConversationContent>
          {messages.map((msg) => {
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

            return (
              <Message key={msg.id} from={isUser ? "user" : "assistant"}>
                <MessageContent>
                  <MessageResponse>{content}</MessageResponse>
                </MessageContent>
              </Message>
            );
          })}
          {isLoading ? (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse>Thinking...</MessageResponse>
              </MessageContent>
            </Message>
          ) : null}
          {askHumanArgs && (
            <QuestionCard
              question={askHumanArgs.kind === "single" ? askHumanArgs.question : undefined}
              choices={askHumanArgs.kind === "single" ? askHumanArgs.choices : undefined}
              questions={askHumanArgs.kind === "multi" ? askHumanArgs.questions : undefined}
              onAnswer={(answer) => void handleAnswer(answer)}
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 space-y-4 pt-4">
        <div className="w-full px-4 pb-4">
          <PromptInput globalDrop onSubmit={handleSubmit}>
            <PromptInputHeader />
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setText(event.target.value)}
                value={text}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit
                disabled={!text.trim() || isLoading}
                status={isLoading ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default RunningAgent;
