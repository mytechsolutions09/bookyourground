-- ============================================================
-- Migration: 20260511180000_create_contract_submissions.sql
-- Description: Ground owner contract e-signature submissions
-- ============================================================

-- ── 1. Table ─────────────────────────────────────────────────
create table if not exists public.contract_submissions (
  id               uuid        primary key default gen_random_uuid(),

  -- Signer details
  owner_name       text        not null,
  company          text,
  venue_name       text        not null,
  address          text,
  city             text,
  state            text,
  phone            text        not null,
  email            text        not null,

  -- Commercial terms
  commission_type  text        not null check (commission_type in ('%', '₹')),
  commission_value text        not null,
  gst_included     boolean     not null default true,

  -- Signature (base-64 PNG data URI)
  signature_data   text        not null,

  -- Workflow
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected')),
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid        references auth.users (id) on delete set null,
  notes            text        -- admin review notes
);

-- ── 2. Indexes ───────────────────────────────────────────────
create index if not exists contract_submissions_status_idx
  on public.contract_submissions (status);

create index if not exists contract_submissions_submitted_at_idx
  on public.contract_submissions (submitted_at desc);

create index if not exists contract_submissions_email_idx
  on public.contract_submissions (email);

-- ── 3. Enable Row Level Security ─────────────────────────────
alter table public.contract_submissions enable row level security;

-- ── 4. RLS Policies ─────────────────────────────────────────

-- 4a. Anyone (including anonymous visitors) can INSERT a submission
--     (the public contract signing page is unauthenticated)
create policy "Public can submit contracts"
  on public.contract_submissions
  for insert
  to anon, authenticated
  with check (true);

-- 4b. Super-admins can read all submissions
create policy "Super admin can read all submissions"
  on public.contract_submissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id   = auth.uid()
        and profiles.role = 'super_admin'
    )
    or auth.email() = 'invirtualcoin@gmail.com'
  );

-- 4c. Super-admins can update status / notes / reviewed_at
create policy "Super admin can update submissions"
  on public.contract_submissions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id   = auth.uid()
        and profiles.role = 'super_admin'
    )
    or auth.email() = 'invirtualcoin@gmail.com'
  )
  with check (true);

-- 4d. Super-admins can delete if needed
create policy "Super admin can delete submissions"
  on public.contract_submissions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id   = auth.uid()
        and profiles.role = 'super_admin'
    )
    or auth.email() = 'invirtualcoin@gmail.com'
  );

-- ── 5. Helper: stamp reviewed_at & reviewed_by on status change ──
create or replace function public.stamp_contract_review()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger contract_submission_review_stamp
  before update on public.contract_submissions
  for each row
  execute function public.stamp_contract_review();

-- ── 6. Realtime (optional – enable if you want live updates) ─
-- alter publication supabase_realtime add table public.contract_submissions;
