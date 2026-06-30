-- ============================================================================
-- Aniya — Baby Memory & Growth Tracker
-- Run this in the Supabase SQL editor (Project → SQL → New query).
-- It is idempotent: safe to re-run during development.
-- ============================================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Family: one per app installation. Each family tracks one baby.
create table if not exists public.families (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Our Family',
  baby_name text not null default 'Baby',
  baby_birthday date,
  baby_photo_url text,
  baby_bio text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public profile mirrored from auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Family membership + role.
-- role: 'owner' | 'editor' | 'viewer'
create table if not exists public.family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'editor', 'viewer')),
  invited_email text,
  invited_at timestamptz default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists family_members_user_unique
  on public.family_members (family_id, user_id)
  where user_id is not null;
create unique index if not exists family_members_invite_unique
  on public.family_members (family_id, invited_email)
  where invited_email is not null and user_id is null;
create index if not exists family_members_family_idx
  on public.family_members (family_id);

-- Timeline entries: the unified table that powers the feed.
-- module discriminates between memory / growth / feeding / sleep / milestone / first.
create table if not exists public.timeline_entries (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  module text not null
    check (module in ('memory', 'growth', 'feeding', 'sleep', 'milestone', 'first')),
  title text not null,
  caption text,
  occurred_at timestamptz not null default now(),
  media_urls text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists timeline_entries_family_occurred_idx
  on public.timeline_entries (family_id, occurred_at desc);
create index if not exists timeline_entries_family_module_idx
  on public.timeline_entries (family_id, module);

-- ============================================================================
-- 2. TRIGGERS
-- ============================================================================

-- updated_at auto-touch
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_families_updated on public.families;
create trigger trg_families_updated
  before update on public.families
  for each row execute function public.set_updated_at();

drop trigger if exists trg_timeline_updated on public.timeline_entries;
create trigger trg_timeline_updated
  before update on public.timeline_entries
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. STORAGE
-- ============================================================================
-- Create the bucket from SQL (Supabase also lets you do this via the UI).
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- ============================================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================================

alter table public.families         enable row level security;
alter table public.profiles         enable row level security;
alter table public.family_members   enable row level security;
alter table public.timeline_entries enable row level security;

-- Helper: get my role in a given family (security definer so RLS can call it).
create or replace function public.my_family_role(p_family_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.family_members
  where family_id = p_family_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid()
  );
$$;

-- ----- profiles ----------------------------------------------------------
drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "profiles family read" on public.profiles;

-- Profiles are visible to everyone in the same family and the user themselves.
create policy "profiles self read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles family read"
  on public.profiles for select
  using (
    exists(
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm2.family_id = fm1.family_id
      where fm1.user_id = auth.uid()
        and fm2.user_id = profiles.id
    )
  );

create policy "profiles self write"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----- families ---------------------------------------------------------
drop policy if exists "families member read" on public.families;
drop policy if exists "families owner write"  on public.families;

create policy "families member read"
  on public.families for select
  using (public.is_family_member(id));

create policy "families owner write"
  on public.families for update
  using (public.my_family_role(id) = 'owner')
  with check (public.my_family_role(id) = 'owner');

-- Anyone authenticated can create a family (they become owner of a new row).
drop policy if exists "families insert self" on public.families;
create policy "families insert self"
  on public.families for insert
  with check (auth.uid() = created_by);

-- ----- family_members ----------------------------------------------------
drop policy if exists "members read"      on public.family_members;
drop policy if exists "members owner manage" on public.family_members;
drop policy if exists "members self insert"  on public.family_members;
drop policy if exists "members self update"  on public.family_members;

create policy "members read"
  on public.family_members for select
  using (public.is_family_member(family_id) or user_id = auth.uid());

-- Only the owner can invite / change roles / remove members.
create policy "members owner manage"
  on public.family_members for all
  using (public.my_family_role(family_id) = 'owner')
  with check (public.my_family_role(family_id) = 'owner');

-- A user can join their own pending invite row (claimed via auth).
create policy "members self update"
  on public.family_members for update
  using (user_id is null and invited_email = (select email from auth.users where id = auth.uid()))
  with check (user_id = auth.uid());

-- ----- timeline_entries --------------------------------------------------
drop policy if exists "entries member read" on public.timeline_entries;
drop policy if exists "entries editor write" on public.timeline_entries;
drop policy if exists "entries editor update" on public.timeline_entries;
drop policy if exists "entries editor delete" on public.timeline_entries;
drop policy if exists "entries editor insert" on public.timeline_entries;

create policy "entries member read"
  on public.timeline_entries for select
  using (public.is_family_member(family_id));

create policy "entries editor insert"
  on public.timeline_entries for insert
  with check (public.my_family_role(family_id) in ('owner', 'editor'));

create policy "entries editor update"
  on public.timeline_entries for update
  using (
    created_by = auth.uid()
    or public.my_family_role(family_id) = 'owner'
  )
  with check (public.is_family_member(family_id));

create policy "entries editor delete"
  on public.timeline_entries for delete
  using (
    created_by = auth.uid()
    or public.my_family_role(family_id) = 'owner'
  );

-- ============================================================================
-- 5. STORAGE POLICIES
-- ============================================================================
-- Family-scoped folder convention: {family_id}/{entry_id}/{filename}
-- We'll authorize via the entry's family_id.

drop policy if exists "media member read"  on storage.objects;
drop policy if exists "media editor write" on storage.objects;
drop policy if exists "media owner delete" on storage.objects;

create policy "media member read"
  on storage.objects for select
  using (
    bucket_id = 'media'
    and public.is_family_member((split_part(name, '/', 1))::uuid)
  );

create policy "media editor write"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and public.my_family_role((split_part(name, '/', 1))::uuid) in ('owner', 'editor')
  );

create policy "media owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and public.my_family_role((split_part(name, '/', 1))::uuid) in ('owner', 'editor')
  );

-- ============================================================================
-- 6. RPC: helper for accepting an invite
-- ============================================================================
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where invited_email = (select email from auth.users where id = auth.uid())
    and user_id is null
  limit 1;

  if v_member_id is null then
    raise exception 'No pending invite for this user';
  end if;

  update public.family_members
  set user_id = auth.uid(), joined_at = now()
  where id = v_member_id;

  return v_family_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.accept_invite(text) to authenticated;