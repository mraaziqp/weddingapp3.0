-- Fix: guests cannot post to the well-wishes wall.
-- ─────────────────────────────────────────────────────────────────────────
-- `well_wishes` was added after schema.sql was written, so it never got into
-- that file's "anon full access" policy loop. The table has RLS enabled with
-- no INSERT policy, so every guest POST fails with:
--
--   42501: new row violates row-level security policy for table "well_wishes"
--
-- Reads succeed, which is why the wall looks fine but stays permanently empty.
--
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Safe to re-run.

create extension if not exists pgcrypto;

-- Create the table if this is a fresh project — schema.sql never defined it.
create table if not exists well_wishes (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table well_wishes enable row level security;

-- Matches how every other table in schema.sql is policied: this app has no
-- Supabase Auth, guests use the anon key directly, and admin access is gated
-- at the app layer (src/middleware.ts + src/lib/admin-auth.ts), not by RLS.
drop policy if exists "anon full access" on well_wishes;
create policy "anon full access" on well_wishes
  for all to anon, authenticated
  using (true) with check (true);
