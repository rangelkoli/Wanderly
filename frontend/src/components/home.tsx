import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router";
import { GrAttachment } from "react-icons/gr";
import { FaTelegramPlane } from "react-icons/fa";
import { FaMicrophone } from "react-icons/fa6";
import { useState } from "react";

export function Home() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const sessions = useQuery(api.sessions.list);
  const currentUser = useQuery(api.users.getCurrent);
  const createSession = useMutation(api.sessions.create);
  const [query, setQuery] = useState("");

  const recentSessions = sessions?.slice(0, 5) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const tempThreadId = `temp_${Date.now()}`;
    
    const newSessionId = await createSession({
      threadId: tempThreadId,
      title: query.slice(0, 50) + (query.length > 50 ? "..." : ""),
    });
    
    navigate(`/chat/${newSessionId}?q=${encodeURIComponent(query)}`);
  };

  const handleSelectSession = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Wanderly</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut()}
          className="gap-2"
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="mt-8 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl w-full max-w-2xl">
          <form
            onSubmit={handleSubmit}
          >
            <div>
              <textarea
                className="resize-none overflow-hidden w-full p-3 border border-none rounded-md focus:outline-none focus:border-blue-500"
                placeholder="Type your message here..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              ></textarea>
            </div>
            <div className="flex flex-row justify-between">
              <div className="flex items-center gap-3 mb-2">
                <Button size="sm" className="gap-2 bg-transparent">
                  <GrAttachment size={24} color="white" />
                </Button>
                <Button size="sm" className="gap-2 bg-transparent">
                  <FaMicrophone size={24} color="white" />
                </Button>
              </div>
              <div>
                <Button className="mt-2 bg-transparent" type="submit">
                  <FaTelegramPlane color="white" size={24} />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
