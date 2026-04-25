alter table public.waitlist_signups
  add column if not exists verified_at timestamptz,
  add column if not exists verify_token_hash text,
  add column if not exists verify_token_expires_at timestamptz,
  add column if not exists last_verification_sent_at timestamptz;

create index if not exists waitlist_signups_verify_token_hash_idx
  on public.waitlist_signups (verify_token_hash)
  where verify_token_hash is not null;
