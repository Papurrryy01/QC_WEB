-- Add optional bio field to profiles.
-- Safe to run multiple times.

alter table if exists public.profiles
  add column if not exists bio text;

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_bio_length_chk'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_chk
      check (bio is null or char_length(bio) <= 280);
  end if;
end;
$$;
