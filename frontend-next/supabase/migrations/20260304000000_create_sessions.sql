-- Create sessions table for chat session persistence
-- Replaces the Convex sessions table used in the Vite frontend

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fetching sessions by user, ordered by most recently updated
create index if not exists sessions_user_updated_idx
  on public.sessions (user_id, updated_at desc);

-- Enable Row Level Security
alter table public.sessions enable row level security;

-- RLS policies: users can only access their own sessions
create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can create their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on row modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_updated_at
  before update on public.sessions
  for each row
  execute function public.handle_updated_at();
