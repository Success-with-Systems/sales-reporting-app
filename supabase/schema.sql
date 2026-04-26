-- =============================================
-- Sales Reporting App - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Tenants (companies)
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Profiles extend auth.users with tenant + role
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'agent' check (role in ('agent', 'manager', 'admin')),
  agent_type text check (agent_type in ('setter', 'closer', 'both')),
  created_at timestamptz default now()
);

create index if not exists profiles_tenant_idx on profiles(tenant_id);

-- Invitations (admins create these to allow signup)
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null default 'agent' check (role in ('agent', 'manager', 'admin')),
  agent_type text check (agent_type in ('setter', 'closer', 'both')),
  full_name text,
  used_at timestamptz,
  created_at timestamptz default now(),
  unique (email, tenant_id)
);

-- Daily metric submissions
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  role_type text not null check (role_type in ('setter', 'closer')),

  -- Setter metrics
  discoveries_booked int default 0,
  discoveries_sat int default 0,
  no_shows int default 0,
  rebooked int default 0,
  consults_booked int default 0,
  consults_confirmed int default 0,
  dials_done int default 0,
  bookings_from_dials int default 0,

  -- Closer metrics
  first_time_consults int default 0,
  qualified_in int default 0,
  qualified_out int default 0,
  offer_presented int default 0,
  closed_sales int default 0,
  follow_up_calls_booked int default 0,
  follow_up_calls_sat int default 0,
  follow_ups_rescheduled int default 0,

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (user_id, date, role_type)
);

create index if not exists submissions_tenant_date_idx on submissions(tenant_id, date desc);
create index if not exists submissions_user_idx on submissions(user_id);

-- =============================================
-- Auto-create profile on signup using invitation
-- =============================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation record;
begin
  select * into invitation
  from invitations
  where lower(email) = lower(new.email) and used_at is null
  order by created_at desc
  limit 1;

  if invitation.id is null then
    raise exception 'No invitation found for %. Contact your administrator.', new.email;
  end if;

  insert into profiles (id, tenant_id, email, full_name, role, agent_type)
  values (new.id, invitation.tenant_id, new.email, invitation.full_name, invitation.role, invitation.agent_type);

  update invitations set used_at = now() where id = invitation.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- RLS policies (tenant isolation)
-- =============================================

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table invitations enable row level security;
alter table submissions enable row level security;

create or replace function user_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id from profiles where id = auth.uid()
$$;

create or replace function user_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid()
$$;

drop policy if exists "see own tenant" on tenants;
create policy "see own tenant" on tenants for select to authenticated
  using (id = user_tenant_id());

drop policy if exists "see tenant profiles" on profiles;
create policy "see tenant profiles" on profiles for select to authenticated
  using (tenant_id = user_tenant_id());

drop policy if exists "admins update tenant profiles" on profiles;
create policy "admins update tenant profiles" on profiles for update to authenticated
  using (tenant_id = user_tenant_id() and user_role() = 'admin');

drop policy if exists "see tenant submissions" on submissions;
create policy "see tenant submissions" on submissions for select to authenticated
  using (tenant_id = user_tenant_id());

drop policy if exists "insert own submissions" on submissions;
create policy "insert own submissions" on submissions for insert to authenticated
  with check (user_id = auth.uid() and tenant_id = user_tenant_id());

drop policy if exists "update own submissions" on submissions;
create policy "update own submissions" on submissions for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "managers update tenant submissions" on submissions;
create policy "managers update tenant submissions" on submissions for update to authenticated
  using (tenant_id = user_tenant_id() and user_role() in ('manager', 'admin'));

drop policy if exists "admins see invitations" on invitations;
create policy "admins see invitations" on invitations for select to authenticated
  using (tenant_id = user_tenant_id() and user_role() = 'admin');

drop policy if exists "admins create invitations" on invitations;
create policy "admins create invitations" on invitations for insert to authenticated
  with check (tenant_id = user_tenant_id() and user_role() = 'admin');
