-- Home + onboarding schema upgrade
-- Safe to run on existing environments.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists timezone text,
  add column if not exists theme_preference text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.profiles
set
  theme_preference = coalesce(theme_preference, 'midnight'),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.profiles
  alter column theme_preference set default 'midnight',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

alter table public.profiles
  alter column theme_preference set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end;
$$;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  email_local_part text;
begin
  email_local_part := split_part(coalesce(new.email, ''), '@', 1);

  insert into public.profiles (
    id,
    display_name,
    username
  )
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', email_local_part)), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table if exists public.moments
  add column if not exists is_featured boolean not null default false,
  add column if not exists category text,
  add column if not exists media_url text;

do $$
declare
  schedule_column text;
begin
  if to_regclass('public.moments') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'moments'
      and column_name = 'scheduled_for_utc'
  ) then
    schedule_column := 'scheduled_for_utc';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'moments'
      and column_name = 'scheduled_at'
  ) then
    schedule_column := 'scheduled_at';
  end if;

  if schedule_column is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'moments'
         and column_name = 'sender_id'
     )
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'moments'
         and column_name = 'created_at'
     ) then
    execute format(
      'create index if not exists moments_sender_timeline_idx on public.moments (sender_id, %I desc, created_at desc)',
      schedule_column
    );
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'moments'
      and column_name = 'sender_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'moments'
      and column_name = 'is_featured'
  ) then
    create index if not exists moments_sender_featured_idx
      on public.moments (sender_id, is_featured)
      where is_featured = true;
  end if;
end;
$$;

alter table if exists public.moments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moments'
      and policyname = 'moments_select_own'
  ) then
    create policy moments_select_own
      on public.moments
      for select
      to authenticated
      using (auth.uid() = sender_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moments'
      and policyname = 'moments_insert_own'
  ) then
    create policy moments_insert_own
      on public.moments
      for insert
      to authenticated
      with check (auth.uid() = sender_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moments'
      and policyname = 'moments_update_own'
  ) then
    create policy moments_update_own
      on public.moments
      for update
      to authenticated
      using (auth.uid() = sender_id)
      with check (auth.uid() = sender_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moments'
      and policyname = 'moments_delete_own'
  ) then
    create policy moments_delete_own
      on public.moments
      for delete
      to authenticated
      using (auth.uid() = sender_id);
  end if;
end;
$$;
