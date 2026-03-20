-- =============================================
-- ProductiveDeveloper - Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- ── Todos ──────────────────────────────────────────────────────────────────
create table if not exists todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  description text,
  status      text not null default 'todo'
                check (status in ('todo','in_progress','review','done','blocked')),
  priority    text not null default 'medium'
                check (priority in ('low','medium','high')),
  due_date    date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table todos enable row level security;

create policy "Users can manage their own todos"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger todos_updated_at before update on todos
  for each row execute procedure update_updated_at();

-- ── Journal Entries ────────────────────────────────────────────────────────
create table if not exists journal_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  title            text not null,
  content          text not null,
  mood             text check (mood in ('great','good','okay','tired','stressed')),
  tags             text[] default '{}',
  what_went_well   text,
  what_to_improve  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table journal_entries enable row level security;

create policy "Users can manage their own journal entries"
  on journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger journal_entries_updated_at before update on journal_entries
  for each row execute procedure update_updated_at();

-- ── Pomodoro Sessions ──────────────────────────────────────────────────────
create table if not exists pomodoro_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  duration_minutes  integer not null default 25,
  mode              text not null default 'work'
                      check (mode in ('work','short','long')),
  created_at        timestamptz default now()
);

alter table pomodoro_sessions enable row level security;

create policy "Users can manage their own pomodoro sessions"
  on pomodoro_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
