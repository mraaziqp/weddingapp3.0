-- Wedu 3.0 — Supabase schema setup
-- ─────────────────────────────────────────────────────────────────────────
-- The Supabase project this app points to (NEXT_PUBLIC_SUPABASE_URL) has no
-- tables and no storage buckets yet, which is why guests/RSVP/registry/
-- playlist/vault/photo-uploads all fail. Paste this whole file into
-- Supabase Dashboard → SQL Editor → New query → Run, once.
--
-- Safe to re-run: every statement is IF NOT EXISTS / ON CONFLICT DO NOTHING.

create extension if not exists pgcrypto;

-- ── households ──────────────────────────────────────────────────────────
create table if not exists households (
  id         text primary key,
  name       text not null,
  address    text,
  qr_code    text unique not null,
  created_at timestamptz not null default now()
);

-- ── tables (seating) ────────────────────────────────────────────────────
create table if not exists tables (
  id         text primary key,
  name       text not null,
  capacity   integer not null,
  shape      text not null default 'round-8',
  pos_x      real default 0,
  pos_y      real default 0,
  created_at timestamptz not null default now()
);

-- ── guests ──────────────────────────────────────────────────────────────
create table if not exists guests (
  id                   text primary key,
  household_id         text not null references households(id) on delete cascade,
  first_name           text not null,
  last_name            text not null,
  rsvp_status          text not null default 'Pending',
  dietary_restrictions text,
  song_request         text,
  tags                 text, -- comma-separated, e.g. "Groom's Friends,Do Not Sit Together"
  table_id             text references tables(id) on delete set null,
  checked_in_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── menu_items ──────────────────────────────────────────────────────────
create table if not exists menu_items (
  id            text primary key,
  name          text not null,
  description   text not null default '',
  course        text not null, -- canapes | starters | mains | desserts
  dietary_flags text,          -- comma-separated e.g. "vegan,gluten-free"
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── timeline_events ─────────────────────────────────────────────────────
create table if not exists timeline_events (
  id          text primary key,
  time        text not null, -- '14:00'
  title       text not null,
  description text,
  category    text not null default 'other',
  is_public   boolean not null default true,
  duration    integer, -- minutes
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── tracks (playlist) ───────────────────────────────────────────────────
create table if not exists tracks (
  id           text primary key,
  title        text not null,
  artist       text not null,
  "column"     text not null default 'if-time', -- must-play | if-time | do-not-play
  requested_by text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ── media (photo/video uploads: live wall + private vault) ─────────────
create table if not exists media (
  id         uuid primary key default gen_random_uuid(),
  guest_id   text references guests(id) on delete set null,
  media_url  text not null,
  media_type text not null default 'image', -- image | video | audio
  visibility text not null default 'public', -- public | private
  quest_tag  text,
  created_at timestamptz not null default now()
);

-- ── gifts (registry) ────────────────────────────────────────────────────
create table if not exists gifts (
  id             text primary key,
  name           text not null,
  price          real not null,
  image_url      text,
  store_url      text,
  is_crowdfund   boolean not null default false,
  funded_amount  real not null default 0,
  created_at     timestamptz not null default now()
);

-- ── contributions (honeymoon fund) ──────────────────────────────────────
create table if not exists contributions (
  id           text primary key,
  gift_id      text not null references gifts(id) on delete cascade,
  guest_id     text references guests(id) on delete set null,
  amount       real not null,
  is_anonymous boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── std_opens (save-the-date open/view analytics) ──────────────────────
create table if not exists std_opens (
  id         uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'view' | 'opened'
  user_agent text,
  created_at timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────────────────
-- This app has no Supabase Auth — guests use the anon key directly, and
-- admin access is gated by a separate app-level key (see src/middleware.ts),
-- not by Supabase RLS. So: enable RLS (best practice) but allow the anon
-- role to do everything, matching how the app already behaves.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'households','tables','guests','menu_items','timeline_events',
    'tracks','media','gifts','contributions','std_opens'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'drop policy if exists "anon full access" on %I;', t
    );
    execute format(
      'create policy "anon full access" on %I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ── Storage buckets ─────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wedding-assets', 'wedding-assets', true)
on conflict (id) do nothing;

-- Public read + anon upload for both buckets (guest camera / save-the-date editor)
drop policy if exists "public read wedding-photos" on storage.objects;
create policy "public read wedding-photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'wedding-photos');

drop policy if exists "anon upload wedding-photos" on storage.objects;
create policy "anon upload wedding-photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'wedding-photos');

drop policy if exists "public read wedding-assets" on storage.objects;
create policy "public read wedding-assets" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'wedding-assets');

drop policy if exists "anon upload wedding-assets" on storage.objects;
create policy "anon upload wedding-assets" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'wedding-assets');
