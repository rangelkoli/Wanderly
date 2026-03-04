"use client";

import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function ChatShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ sessionId?: string }>();
  const currentSessionId = params?.sessionId;

  const handleNewSession = () => {
    router.push("/chat");
  };

  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat/${sessionId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
      <Sidebar
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
