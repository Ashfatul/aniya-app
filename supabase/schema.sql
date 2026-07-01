-- ============================================================================
-- Aniya — Baby Memory & Growth Tracker
-- Run this in the Supabase SQL editor (Project → SQL → New query).
-- It is idempotent: safe to re-run during development.
-- ============================================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

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
values ('media', 'media', true)
on conflict (id) do update set public = true;

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

-- Allow the creator of a family to read it (required to bypass chicken-and-egg RLS lock during setup)
drop policy if exists "families creator read" on public.families;
create policy "families creator read"
  on public.families for select
  using (created_by = auth.uid());

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

-- Allow the initial owner to insert their own membership for a family they created.
create policy "members self insert"
  on public.family_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists(
      select 1 from public.families
      where id = family_id and created_by = auth.uid()
    )
  );

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

-- ============================================================================
-- 7. INVITE TOKENS — secure, single-use share links for inviting members.
-- ============================================================================
-- The owner generates a token in the app, the app inserts a row with a
-- signed token string ("<uuid>.<hmac>"), and copies the link. The recipient
-- opens the link, signs up, and the server claims the token via
-- `claim_invite_by_token`, which atomically creates their family_members
-- row in the inviter's family.
--
-- We use a token table (rather than reusing `family_members.id`) for two
-- reasons:
--   1. RLS on `family_members` does not let an anonymous user read pending
--      invite rows, so the signup page can't show "Join your family" without
--      a SECURITY DEFINER RPC. A dedicated table with its own access surface
--      is easier to reason about.
--   2. The token can be rotated, expired, and consumed independently of the
--      membership row, which is what we want for share-link semantics.
-- ============================================================================

create table if not exists public.invite_tokens (
  token text primary key,             -- "<uuid>.<hmac-sha256-hex>"
  family_id uuid not null references public.families(id) on delete cascade,
  invited_email text not null,
  role text not null default 'viewer'
    check (role in ('editor', 'viewer')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists invite_tokens_family_idx
  on public.invite_tokens (family_id);
create index if not exists invite_tokens_email_open_idx
  on public.invite_tokens (invited_email)
  where consumed_at is null;

alter table public.invite_tokens enable row level security;

-- Owners can create tokens for their own family. No direct reads for anon or
-- auth — the lookup / claim go through SECURITY DEFINER RPCs.
drop policy if exists "invite_tokens owner write" on public.invite_tokens;
create policy "invite_tokens owner write"
  on public.invite_tokens for insert
  with check (public.my_family_role(family_id) = 'owner');

drop policy if exists "invite_tokens owner delete" on public.invite_tokens;
create policy "invite_tokens owner delete"
  on public.invite_tokens for delete
  using (public.my_family_role(family_id) = 'owner');

-- Single-row secret store. Rotated by UPDATE in the SQL editor. We do not
-- grant SELECT to anyone — only the SECURITY DEFINER functions below read it.
create table if not exists public.invite_secrets (
  id int primary key default 1 check (id = 1),
  secret text not null
);
insert into public.invite_secrets (id, secret)
values (1, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

-- ===== helpers: sign / verify / lookup / claim =====

create or replace function public.sign_invite_token(p_payload text)
returns text
language sql
stable
as $$
  select p_payload || '.' || encode(
    hmac(p_payload, (select secret from public.invite_secrets where id = 1), 'sha256'),
    'hex'
  );
$$;

create or replace function public.verify_invite_token(p_token text)
returns text
language plpgsql
stable
as $$
declare
  v_dot int;
  v_payload text;
  v_expected text;
  v_got text;
begin
  v_dot := strpos(p_token, '.');
  if v_dot = 0 then return null; end if;
  v_payload := substring(p_token from 1 for v_dot - 1);
  v_expected := substring(p_token from v_dot + 1);
  v_got := encode(
    hmac(v_payload, (select secret from public.invite_secrets where id = 1), 'sha256'),
    'hex'
  );
  if v_expected = v_got then
    return v_payload;
  end if;
  return null;
end;
$$;

-- Anonymous-safe lookup. Returns one row if the token is well-formed, signed
-- correctly, not expired, and not yet consumed; otherwise no rows.
create or replace function public.lookup_invite_by_token(p_token text)
returns table (
  family_id uuid,
  family_name text,
  baby_name text,
  invited_email text,
  role text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.verify_invite_token(p_token) is null then
    return;
  end if;

  return query
    select t.family_id, f.name, f.baby_name, t.invited_email, t.role, t.expires_at
    from public.invite_tokens t
    join public.families f on f.id = t.family_id
    where t.token = p_token
      and t.consumed_at is null
      and t.expires_at > now();
end;
$$;

-- Atomic claim. Idempotent for the same (token, user): if the same user
-- already consumed it, returns the family_id without re-inserting. If a
-- different user already consumed it, raises.
create or replace function public.claim_invite_by_token(
  p_token text,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
begin
  if public.verify_invite_token(p_token) is null then
    raise exception 'Invalid or tampered invite link';
  end if;

  select t.family_id, t.invited_email, t.role, t.consumed_by
    into v_record
    from public.invite_tokens t
    where t.token = p_token
    for update;

  if not found then
    raise exception 'Invite not found';
  end if;
  if v_record.expires_at <= now() then
    raise exception 'This invite link has expired';
  end if;
  if v_record.consumed_by is not null and v_record.consumed_by <> p_user_id then
    raise exception 'This invite has already been used';
  end if;
  if v_record.consumed_by = p_user_id then
    -- Already claimed by this user. Make sure their family_members row exists.
    insert into public.family_members (family_id, user_id, role, joined_at)
      values (v_record.family_id, p_user_id, v_record.role, now())
      on conflict (family_id, user_id) do nothing;
    return v_record.family_id;
  end if;

  update public.invite_tokens
    set consumed_at = now(),
        consumed_by = p_user_id
    where token = p_token;

  insert into public.family_members (family_id, user_id, role, joined_at)
    values (v_record.family_id, p_user_id, v_record.role, now())
    on conflict (family_id, user_id) do update
      set role = excluded.role,
          joined_at = now();

  return v_record.family_id;
end;
$$;

grant execute on function public.lookup_invite_by_token(text) to anon, authenticated;
grant execute on function public.claim_invite_by_token(text, uuid) to authenticated;

-- Build the canonical signed token for a fresh invite. The app passes the
-- payload (typically the invite row's own uuid) and uses the returned string
-- as the primary key. Doing it in SQL keeps the secret on the server.
create or replace function public.create_invite_token(
  p_family_id uuid,
  p_invited_email text,
  p_role text,
  p_ttl interval default interval '7 days'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload text;
  v_token text;
  v_expires timestamptz;
begin
  if public.my_family_role(p_family_id) is distinct from 'owner' then
    raise exception 'Only the family owner can create invite tokens';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception 'Invalid role %', p_role;
  end if;

  v_payload := gen_random_uuid()::text;
  v_token := public.sign_invite_token(v_payload);
  v_expires := now() + p_ttl;

  insert into public.invite_tokens (token, family_id, invited_email, role, expires_at)
  values (v_token, p_family_id, lower(p_invited_email), p_role, v_expires);

  return v_token;
end;
$$;

grant execute on function public.create_invite_token(uuid, text, text, interval) to authenticated;