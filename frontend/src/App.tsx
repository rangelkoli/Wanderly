"use client";

import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { LoginForm } from "@/components/login";
import { SignupForm } from "@/components/signup";
import RunningAgent from "./components/running-agent";
import { Home } from "./components/home";
import { Sidebar } from "./components/sidebar";
import { useTheme } from "./components/theme-provider";
import { Moon, Sun, Menu, X } from "lucide-react";
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router";
import { Navigate } from "react-router";
import { Button } from "./components/ui/button";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ChatLayout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const createSession = useMutation(api.sessions.create);

  const handleNewSession = async () => {
    const tempThreadId = `temp_${Date.now()}`;
    const newSessionId = await createSession({
      threadId: tempThreadId,
      title: "New Chat",
    });
    void navigate(`/chat/${newSessionId}`);
  };

  const handleSelectSession = (newSessionId: string) => {
    void navigate(`/chat/${newSessionId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          currentSessionId={sessionId}
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-950 p-3 border-b-2 border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
          <span className="font-semibold">Wanderly</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <RunningAgent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:sessionId"
          element={
            <ProtectedRoute>
              <RunningAgent />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<AuthForms />} />
      </Routes>
    </BrowserRouter>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-2"
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

function AuthForms() {
  const [view, setView] = useState<"login" | "signup">("login");

  if (view === "login") {
    return <LoginForm onSwitchToSignup={() => setView("signup")} />;
  }

  return <SignupForm onSwitchToLogin={() => setView("login")} />;
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-sm font-medium"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      )}
    </>
  );
}
