"use client";

/**
 * Session storage layer that replaces Convex sessions CRUD.
 *
 * Sessions are persisted per-user in Supabase in a `sessions` table.
 * The table schema mirrors the old Convex model:
 *
 *   id          uuid  (PK, default gen_random_uuid())
 *   user_id     uuid  (FK → auth.users.id)
 *   thread_id   text
 *   title       text
 *   created_at  timestamptz (default now())
 *   updated_at  timestamptz (default now())
 *
 * If Supabase is not yet set up (or the table doesn't exist), we fall back
 * to localStorage so the app still works in local-only mode.
 */

import { createClient } from "@/lib/supabase/client";

export interface Session {
  id: string;
  user_id: string;
  thread_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Supabase CRUD
// ---------------------------------------------------------------------------

const supabase = () => createClient();

export async function listSessions(): Promise<Session[]> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("listSessions error:", error);
    return listSessionsLocal();
  }

  return (data ?? []) as Session[];
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("getSession error:", error);
    return getSessionLocal(sessionId);
  }

  return data as Session | null;
}

export async function createSession(
  threadId: string,
  title?: string,
): Promise<string> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    // Fallback: create locally
    return createSessionLocal(threadId, title);
  }

  const { data, error } = await sb
    .from("sessions")
    .insert({
      user_id: user.id,
      thread_id: threadId,
      title: title ?? "New Chat",
    })
    .select("id")
    .single();

  if (error) {
    console.error("createSession error:", error);
    return createSessionLocal(threadId, title);
  }

  return data!.id as string;
}

export async function updateSession(
  sessionId: string,
  patch: { title?: string; thread_id?: string },
): Promise<void> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    updateSessionLocal(sessionId, patch);
    return;
  }

  const { error } = await sb
    .from("sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("updateSession error:", error);
    updateSessionLocal(sessionId, patch);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sb = supabase();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    deleteSessionLocal(sessionId);
    return;
  }

  const { error } = await sb
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("deleteSession error:", error);
    deleteSessionLocal(sessionId);
  }
}

// ---------------------------------------------------------------------------
// localStorage fallback  (works without Supabase table)
// ---------------------------------------------------------------------------

const LS_KEY = "wanderly_sessions";

function getLocalSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Session[];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: Session[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(sessions));
}

function listSessionsLocal(): Session[] {
  return getLocalSessions().sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function getSessionLocal(id: string): Session | null {
  return getLocalSessions().find((s) => s.id === id) ?? null;
}

function createSessionLocal(threadId: string, title?: string): string {
  const sessions = getLocalSessions();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sessions.push({
    id,
    user_id: "local",
    thread_id: threadId,
    title: title ?? "New Chat",
    created_at: now,
    updated_at: now,
  });
  saveLocalSessions(sessions);
  return id;
}

function updateSessionLocal(
  id: string,
  patch: { title?: string; thread_id?: string },
) {
  const sessions = getLocalSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  if (patch.title !== undefined) sessions[idx].title = patch.title;
  if (patch.thread_id !== undefined) sessions[idx].thread_id = patch.thread_id;
  sessions[idx].updated_at = new Date().toISOString();
  saveLocalSessions(sessions);
}

function deleteSessionLocal(id: string) {
  saveLocalSessions(getLocalSessions().filter((s) => s.id !== id));
}
