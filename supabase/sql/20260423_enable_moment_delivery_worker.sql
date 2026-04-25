-- QC scheduled delivery worker schema hardening
-- Safe to run before enabling Supabase Cron.

alter table if exists public.moments
  add column if not exists public_id text,
  add column if not exists access_token_hash text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists last_error text,
  add column if not exists delivery_timezone text;

comment on column public.moments.last_error is
  'Last delivery worker error captured while attempting to deliver the moment.';

comment on column public.moments.delivery_timezone is
  'Sender-selected IANA timezone used to interpret the scheduled wall-clock delivery time.';

create unique index if not exists moments_public_id_unique_idx
  on public.moments (public_id)
  where public_id is not null;

create index if not exists moments_delivery_queue_idx
  on public.moments (status, scheduled_for_utc)
  where status in ('published', 'sending', 'failed');

create index if not exists moments_sent_at_idx
  on public.moments (sent_at desc)
  where sent_at is not null;
