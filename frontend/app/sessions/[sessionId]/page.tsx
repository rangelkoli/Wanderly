import { SessionStream } from "@/components/session-stream";

type SessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return <SessionStream sessionId={sessionId} />;
}
