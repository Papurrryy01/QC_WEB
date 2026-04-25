alter table if exists public.moments
  add column if not exists delivery_timezone text;

comment on column public.moments.delivery_timezone is
  'Sender-selected IANA timezone used to interpret the scheduled wall-clock delivery time.';
