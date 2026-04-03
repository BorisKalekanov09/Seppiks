-- ============================================================
-- SEPPIKS — Supabase Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email       text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- ─── PREFERENCES ────────────────────────────────────────────
create table if not exists public.preferences (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.profiles(id) on delete cascade unique,
  categories     text[] default '{}',
  content_type   text default 'fun',
  updated_at     timestamptz default now()
);

-- ─── QUESTIONS ──────────────────────────────────────────────
create table if not exists public.questions (
  id            uuid primary key default uuid_generate_v4(),
  text          text not null,
  category      text not null default 'lifestyle',
  content_type  text not null default 'fun',
  yes_count     integer not null default 0,
  no_count      integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz default now()
);

-- ─── VOTES ──────────────────────────────────────────────────
create table if not exists public.votes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  vote        integer not null check (vote in (0, 1)),  -- 0 = NO, 1 = YES
  created_at  timestamptz default now(),
  unique (user_id, question_id)  -- prevent duplicate votes
);

-- ─── COMMENTS ───────────────────────────────────────────────
create table if not exists public.comments (
  id          uuid primary key default uuid_generate_v4(),
  question_id uuid references public.questions(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 500),
  created_at  timestamptz default now()
);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── INCREMENT VOTE COUNTS ────────────────────────────────────
create or replace function public.increment_vote(q_id uuid, vote_field text)
returns void as $$
begin
  if vote_field = 'yes_count' then
    update public.questions set yes_count = yes_count + 1 where id = q_id;
  elsif vote_field = 'no_count' then
    update public.questions set no_count = no_count + 1 where id = q_id;
  end if;
end;
$$ language plpgsql security definer;

-- ─── AUTO-UPDATE COMMENT COUNT ───────────────────────────────
create or replace function public.update_comment_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.questions set comment_count = comment_count + 1 where id = new.question_id;
  elsif TG_OP = 'DELETE' then
    update public.questions set comment_count = greatest(comment_count - 1, 0) where id = old.question_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure public.update_comment_count();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

-- Profiles
alter table public.profiles enable row level security;
create policy "Public read profiles" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Preferences
alter table public.preferences enable row level security;
create policy "Users read own prefs" on public.preferences for select using (auth.uid() = user_id);
create policy "Users insert own prefs" on public.preferences for insert with check (auth.uid() = user_id);
create policy "Users update own prefs" on public.preferences for update using (auth.uid() = user_id);

-- Questions (public read, no user writes — admin only via service role)
alter table public.questions enable row level security;
create policy "Public read questions" on public.questions for select using (true);

-- Votes
alter table public.votes enable row level security;
create policy "Public read votes" on public.votes for select using (true);
create policy "Users insert own vote" on public.votes for insert with check (auth.uid() = user_id);
create policy "Users delete own vote" on public.votes for delete using (auth.uid() = user_id);

-- Comments
alter table public.comments enable row level security;
create policy "Public read comments" on public.comments for select using (true);
create policy "Users insert own comment" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comment" on public.comments for delete using (auth.uid() = user_id);

-- ─── SEED SAMPLE QUESTIONS ───────────────────────────────────
insert into public.questions (text, category, content_type, yes_count, no_count) values
  ('Would you quit your job to follow your passion?', 'career', 'serious', 64, 36),
  ('Is it ever okay to lie to protect someone you love?', 'relationships', 'serious', 58, 42),
  ('Would you take a pill that permanently doubles your IQ?', 'lifestyle', 'serious', 72, 28),
  ('Would you give up social media forever for $100k?', 'lifestyle', 'fun', 81, 19),
  ('Is it worth staying in a job you hate for the money?', 'career', 'serious', 33, 67),
  ('Would you move to a new country for a relationship?', 'relationships', 'serious', 61, 39),
  ('Should people be required to vote?', 'lifestyle', 'controversial', 48, 52),
  ('Would you rather be famous or rich?', 'lifestyle', 'fun', 35, 65),
  ('Is breakfast the most important meal of the day?', 'lifestyle', 'fun', 54, 46),
  ('Would you accept a job offer with 50% pay cut for 10x more fulfillment?', 'career', 'serious', 44, 56)
on conflict do nothing;
