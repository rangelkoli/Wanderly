import { Suspense } from "react";
import { ChatShell } from "@/components/chat-shell";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <ChatShell>{children}</ChatShell>
    </Suspense>
  );
}
