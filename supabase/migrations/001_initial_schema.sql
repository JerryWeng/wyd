-- ============================================================
-- 001_initial_schema.sql
-- Phase 1: Core tables, RLS, indexes, and auto-user trigger
-- ============================================================


-- ── users ───────────────────────────────────────────────────
-- Mirrors auth.users; holds plan status and Stripe linkage.
-- Created automatically on signup via the trigger below.
-- READ-ONLY from the client. All writes are done by the
-- Stripe webhook server using the service role key.
create table public.users (
  id                     uuid        primary key references auth.users(id) on delete cascade,
  email                  text        not null,
  plan                   text        not null default 'free',
  stripe_customer_id     text        unique,
  stripe_subscription_id text        unique,
  subscription_status    text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint users_plan_check
    check (plan in ('free', 'pro')),
  constraint users_subscription_status_check
    check (subscription_status in ('active', 'canceled', 'past_due') or subscription_status is null)
);

-- ── user_settings ────────────────────────────────────────────
-- One row per user. Mirrors AppSettings (minus blocks, which are normalized).
-- cloud_sync_enabled lives here (not on users) because it is a
-- user preference, not a billing attribute.
-- Row is auto-created on signup. Client may SELECT and UPDATE only.
create table public.user_settings (
  user_id                uuid        primary key references public.users(id) on delete cascade,
  cloud_sync_enabled     boolean     not null default false,
  idle_tracking_enabled  boolean     not null default true,
  idle_timeout_minutes   integer     not null default 5,
  ignored_domains        text[]      not null default '{}',
  default_view           text        not null default 'today',
  default_redirect_url   text        not null default '',
  updated_at             timestamptz not null default now(),

  -- FIX 2: enforce valid view options so a bad value can never be saved
  constraint user_settings_default_view_check
    check (default_view in ('today', '1W', '1M', '1Y', 'total'))
);

-- ── block_rules ──────────────────────────────────────────────
-- Normalized from settings.blocks[]. Each BlockRule is one row.
-- Client has full access: SELECT, INSERT, UPDATE, DELETE.
create table public.block_rules (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  domain        text        not null,
  type          text        not null,
  time_limit    integer,                -- minutes (dailyLimit / weeklyLimit)
  start_time    text,                   -- 'HH:MM' (scheduled)
  end_time      text,                   -- 'HH:MM' (scheduled)
  days          integer[],              -- 0-6, Sun=0 (daysOfWeek)
  deadline_time text,                   -- 'HH:MM' (dailyLimit with deadline)
  redirect_url  text,
  enabled       boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- FIX 1: enforce valid block types so a typo can never silently break blocking logic
  constraint block_rules_type_check
    check (type in ('dailyLimit', 'weeklyLimit', 'scheduled', 'daysOfWeek'))
);

-- ── site_usage ───────────────────────────────────────────────
-- One row per (user, date, domain). Aggregated daily totals.
-- Client may SELECT, INSERT, and UPDATE. No DELETE.
-- Daily totals should never be removed once written.
create table public.site_usage (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  date           date        not null,
  domain         text        not null,
  time_seconds   integer     not null default 0,
  session_count  integer     not null default 0,
  synced_at      timestamptz not null default now(),

  unique (user_id, date, domain),

  -- FIX 4: prevent negative values from ever being written
  constraint site_usage_time_seconds_non_negative  check (time_seconds >= 0),
  constraint site_usage_session_count_non_negative check (session_count >= 0)
);

-- ── sessions ─────────────────────────────────────────────────
-- One row per individual site visit. Powers the Pro breakdown
-- view ("you visited youtube.com at 9am, 2pm, and 8pm").
-- Written as complete records when a visit ends so ended_at
-- and duration_seconds are never null.
-- Client may SELECT and INSERT only. No UPDATE or DELETE —
-- session records are immutable once written.
-- History retention: 30 days for free users, unlimited for Pro.
-- Enforced at the application level, not the database level.
create table public.sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  domain           text        not null,
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  duration_seconds integer     not null,
  created_at       timestamptz not null default now(),

  constraint sessions_duration_positive       check (duration_seconds > 0),
  constraint sessions_ended_after_started     check (ended_at > started_at),
  constraint sessions_duration_matches        check (duration_seconds = extract(epoch from (ended_at - started_at))::integer)
);


-- ── updated_at trigger function ──────────────────────────────
-- Automatically stamps updated_at on every row update.
-- Ensures cross-device sync can reliably resolve conflicts
-- by always picking the row with the newest updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();

create trigger set_block_rules_updated_at
  before update on public.block_rules
  for each row execute procedure public.set_updated_at();


-- ── synced_at trigger function ───────────────────────────────
-- FIX 3: automatically stamps synced_at whenever a site_usage
-- row is updated so you always know when the last sync happened.
-- Without this, synced_at would stay frozen at the original
-- insert time even after subsequent sync flushes.
create or replace function public.set_synced_at()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

create trigger set_site_usage_synced_at
  before update on public.site_usage
  for each row execute procedure public.set_synced_at();


-- ── Auto-create user rows on signup ──────────────────────────
-- Creates both a users row and a user_settings row with defaults
-- so the extension never gets null when fetching after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Row Level Security ───────────────────────────────────────

-- users: SELECT only. No client writes ever.
-- All plan/billing changes go through the Stripe webhook server
-- which uses the service role key and bypasses RLS entirely.
alter table public.users enable row level security;
create policy "users can view own record"
  on public.users for select using (auth.uid() = id);

-- user_settings: SELECT and UPDATE only.
-- The trigger handles INSERT on signup; client never needs to INSERT.
-- DELETE is not permitted — the row must always exist.
alter table public.user_settings enable row level security;
create policy "users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- block_rules: full access. Users own their own rules entirely.
alter table public.block_rules enable row level security;
create policy "users can manage own block rules"
  on public.block_rules for all using (auth.uid() = user_id);

-- site_usage: SELECT, INSERT, and UPDATE. No DELETE.
-- Daily totals should never be removed once written.
-- Users can only ever access their own rows via RLS.
alter table public.site_usage enable row level security;
create policy "users can view own usage"
  on public.site_usage for select using (auth.uid() = user_id);
create policy "users can insert own usage"
  on public.site_usage for insert with check (auth.uid() = user_id);
create policy "users can update own usage"
  on public.site_usage for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions: SELECT and INSERT only.
-- Records are immutable once written. No UPDATE or DELETE ever.
alter table public.sessions enable row level security;
create policy "users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);
create policy "users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);


-- ── Indexes ──────────────────────────────────────────────────
create index on public.site_usage (user_id, date);
create index on public.site_usage (user_id, domain);
create index on public.block_rules (user_id);
create index on public.sessions (user_id, started_at);
create index on public.sessions (user_id, domain);