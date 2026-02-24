import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentSessionId?: string;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export function Sidebar({ currentSessionId, onNewSession, onSelectSession }: SidebarProps) {
  const sessions = useQuery(api.sessions.list);
  const deleteSession = useMutation(api.sessions.remove);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await deleteSession({ sessionId: sessionId as any });
    if (currentSessionId === sessionId) {
      onNewSession();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <aside className="w-64 h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <Button
          onClick={onNewSession}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Plus size={16} />
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sessions === undefined ? (
          <div className="text-sm text-slate-500 p-2">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-sm text-slate-500 p-2">No conversations yet</div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session._id}
                onClick={() => onSelectSession(session._id)}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors",
                  currentSessionId === session._id && "bg-slate-200 dark:bg-slate-800"
                )}
              >
                <MessageSquare size={16} className="shrink-0 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {session.title || "New Chat"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => void handleDelete(e, session._id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-opacity"
                >
                  <Trash2 size={14} className="text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
