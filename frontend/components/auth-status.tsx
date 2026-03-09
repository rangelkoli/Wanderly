"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthState = {
  email: string | null;
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: AuthState = {
  email: null,
  isLoading: true,
  error: null,
};

export function AuthStatus() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>(INITIAL_STATE);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      setAuthState({
        email: data.user?.email ?? null,
        isLoading: false,
        error: error?.message ?? null,
      });
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      startTransition(() => {
        setAuthState({
          email: session?.user?.email ?? null,
          isLoading: false,
          error: null,
        });
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to sign out.",
      }));
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleCreateSession() {
    setIsCreatingSession(true);
    setAuthState((current) => ({ ...current, error: null }));

    try {
      const response = await fetch("/api/langgraph/threads", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { thread_id?: string; id?: string }
        | null;

      if (!response.ok) {
        throw new Error("Unable to create a new LangGraph session.");
      }

      const threadId = payload?.thread_id ?? payload?.id;
      if (!threadId) {
        throw new Error("LangGraph did not return a thread id.");
      }

      router.push(`/sessions/${encodeURIComponent(threadId)}`);
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create a new session.",
      }));
    } finally {
      setIsCreatingSession(false);
    }
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-foreground/80">
          Session
        </p>
        <CardTitle className="text-2xl">
          {authState.isLoading
            ? "Checking Supabase..."
            : authState.email
              ? "You are signed in."
              : "No active session."}
        </CardTitle>
        <CardDescription className="text-base leading-7">
          {authState.email
            ? authState.email
            : "Use the login or signup screen to create a Supabase-authenticated session."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {authState.error ? (
          <p className="basis-full text-sm font-medium text-red-700">{authState.error}</p>
        ) : null}

        {authState.email ? (
          <>
            <Button
              disabled={isCreatingSession || isSigningOut}
              onClick={() => void handleCreateSession()}
              type="button"
            >
              {isCreatingSession ? "Creating session..." : "New session"}
            </Button>
            <Button
              disabled={isCreatingSession || isSigningOut}
              onClick={() => void handleSignOut()}
              type="button"
              variant="outline"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Sign up</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
