# Sales Reporting App

Multi-tenant daily sales metrics tracking. Built with Next.js, Supabase Postgres, and Tailwind.

## What it does

- Sales agents (setters and closers) submit end-of-day numbers via a simple form
- Managers see live dashboards with totals and per-agent performance
- Multiple companies (tenants) can use the same app with full data isolation via Postgres Row Level Security
- Email OTP login (no passwords, no Google auth)

## Setup

### 1. Run the database schema

In Supabase, open SQL Editor and paste the contents of `supabase/schema.sql`. Click Run.

### 2. Set Vercel environment variables

From Supabase → Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — Secret key

### 3. Configure Supabase Auth

**URL Configuration**: set Site URL to your Vercel URL and add `https://YOUR-APP.vercel.app/**` to Redirect URLs.

**Email Templates → Magic Link**: replace the default template so users get a 6-digit code:

```html
<h2>Your sign-in code</h2>
<p>Enter this code to sign in:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px">{{ .Token }}</p>
<p>This code expires in 1 hour.</p>
```

### 4. Bootstrap your first tenant + admin

In Supabase SQL Editor:

```sql
insert into tenants (name, slug) values ('MailScale', 'mailscale');

insert into invitations (email, tenant_id, role, full_name)
values (
  'your-email@example.com',
  (select id from tenants where slug = 'mailscale'),
  'admin',
  'Your Name'
);
```

### 5. Visit your Vercel URL and log in

Enter email → receive code → enter code → you are in.

## Adding agents

As an admin, run in SQL Editor:

```sql
insert into invitations (email, tenant_id, role, agent_type, full_name)
values (
  'agent@company.com',
  (select id from tenants where slug = 'mailscale'),
  'agent',
  'setter',
  'Agent Name'
);
```

A proper in-app admin panel for invitations is on the roadmap.

## Adding another company (tenant)

```sql
insert into tenants (name, slug) values ('Other Co', 'other-co');

insert into invitations (email, tenant_id, role)
values ('admin@other-co.com', (select id from tenants where slug = 'other-co'), 'admin');
```

Each tenant's data is fully isolated by Postgres RLS.

## Local dev

```bash
npm install
cp .env.example .env.local
# fill in Supabase keys
npm run dev
```
