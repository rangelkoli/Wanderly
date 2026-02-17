import { useState, useRef, useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Chat() {
  const stream = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stream.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    void stream.submit({ messages: [{ content: input, type: "human" }] });
    setInput("");
  };

  const renderContent = (content: unknown): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((item) => ("text" in item ? item.text : JSON.stringify(item)))
        .join("");
    }
    return String(content);
  };

  const isUserMessage = (type: string) => type === "human";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 p-4 dark:bg-slate-900">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {stream.messages.length === 0 && !stream.isLoading && (
            <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">Start a conversation...</p>
            </div>
          )}

          {stream.messages.map((message, idx) => (
            <div
              key={message.id ?? idx}
              className={cn(
                "flex",
                isUserMessage(message.type) ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                  isUserMessage(message.type)
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
                )}
              >
                <p className="text-balance whitespace-pre-wrap">
                  {renderContent(message.content)}
                </p>
              </div>
            </div>
          ))}

          {stream.isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <span className="size-2 animate-bounce rounded-full bg-slate-400" />
                <span
                  className="size-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: "100ms" }}
                />
                <span
                  className="size-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: "200ms" }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          {stream.error ? (
            <p className="w-full text-sm text-red-500" role="alert">
              {stream.error instanceof Error
                ? stream.error.message
                : JSON.stringify(stream.error)}
            </p>
          ) : null}
          <form
            onSubmit={handleSubmit}
            className="flex w-full gap-2"
            aria-label="Chat message form"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              aria-label="Message input"
            />
            <Button type="submit" disabled={!input.trim() || stream.isLoading}>
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
