"use client";

/**
 * React hooks for session management.
 *
 * These hooks wrap the CRUD functions in lib/sessions.ts and provide
 * reactive state that components can subscribe to.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type Session,
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
} from "@/lib/sessions";

/**
 * Hook to list all sessions for the current user.
 * Returns { sessions, loading, refresh }.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listSessions();
    setSessions(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}

/**
 * Hook to get a single session by ID.
 */
export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void getSession(sessionId).then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, [sessionId]);

  return { session, loading };
}

/**
 * Hook returning mutation helpers for sessions.
 */
export function useSessionMutations(onMutate?: () => void) {
  const create = useCallback(
    async (threadId: string, title?: string) => {
      const id = await createSession(threadId, title);
      onMutate?.();
      return id;
    },
    [onMutate],
  );

  const update = useCallback(
    async (sessionId: string, patch: { title?: string; thread_id?: string }) => {
      await updateSession(sessionId, patch);
      onMutate?.();
    },
    [onMutate],
  );

  const remove = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
      onMutate?.();
    },
    [onMutate],
  );

  return { create, update, remove };
}
