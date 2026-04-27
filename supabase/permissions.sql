-- =============================================
-- Permissions update: tighten data access so
-- agents only see their own submissions, and
-- managers/admins see all submissions in their tenant.
--
-- Run this in Supabase SQL Editor AFTER the initial schema.sql.
-- Safe to re-run.
-- =============================================

-- Helper: am I a manager or admin?
create or replace function user_is_manager()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role in ('manager', 'admin') from profiles where id = auth.uid()),
    false
  )
$$;

-- Replace the broad "see tenant submissions" policy with a tighter one.
drop policy if exists "see tenant submissions" on submissions;

-- Agents see their own rows only.
drop policy if exists "agents see own submissions" on submissions;
create policy "agents see own submissions" on submissions for select to authenticated
  using (user_id = auth.uid());

-- Managers and admins see all rows in their tenant.
drop policy if exists "managers see tenant submissions" on submissions;
create policy "managers see tenant submissions" on submissions for select to authenticated
  using (tenant_id = user_tenant_id() and user_is_manager());

-- Profiles: agents see their own profile, managers see all profiles in tenant.
drop policy if exists "see tenant profiles" on profiles;

drop policy if exists "agents see own profile" on profiles;
create policy "agents see own profile" on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "managers see tenant profiles" on profiles;
create policy "managers see tenant profiles" on profiles for select to authenticated
  using (tenant_id = user_tenant_id() and user_is_manager());
