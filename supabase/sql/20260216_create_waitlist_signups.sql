-- Execute this script once in the Supabase SQL Editor before testing /api/waitlist.

create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  locale text,
  verified_at timestamptz,
  verify_token_hash text,
  verify_token_expires_at timestamptz,
  last_verification_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists waitlist_signups_email_lower_unique_idx
  on public.waitlist_signups (lower(email));

create index if not exists waitlist_signups_verify_token_hash_idx
  on public.waitlist_signups (verify_token_hash)
  where verify_token_hash is not null;

alter table public.waitlist_signups enable row level security;
