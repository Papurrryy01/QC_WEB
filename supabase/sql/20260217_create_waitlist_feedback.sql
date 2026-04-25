-- Run this after the waitlist_signups table exists.

create table if not exists public.waitlist_feedback (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.waitlist_signups(id) on delete cascade,
  use_case text not null,
  requested_features text[] not null default '{}',
  life_impact text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists waitlist_feedback_signup_id_unique_idx
  on public.waitlist_feedback (signup_id);

create index if not exists waitlist_feedback_created_at_idx
  on public.waitlist_feedback (created_at desc);

alter table public.waitlist_feedback enable row level security;
