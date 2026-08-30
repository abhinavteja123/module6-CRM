-- Super Admin contract, work-order, invoice, and payment history per university.
-- Documents are stored in a private Supabase Storage bucket; FastAPI is the only
-- application data path and issues short-lived signed URLs after authorization.

create table if not exists public.university_contracts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  contract_reference text,
  status text not null default 'active' check (status in ('draft', 'active', 'renewed', 'expired', 'cancelled')),
  total_contract_value numeric(14,2) not null default 0 check (total_contract_value >= 0),
  currency char(3) not null default 'INR',
  work_order_date date,
  contract_start_date date,
  contract_end_date date,
  invoice_number text,
  invoice_date date,
  payment_status text not null default 'not_received' check (payment_status in ('not_received', 'partial', 'received', 'overdue')),
  payment_received_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists university_contracts_university_id_idx
  on public.university_contracts(university_id, created_at desc);

create table if not exists public.university_contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.university_contracts(id) on delete cascade,
  document_type text not null check (document_type in ('work_order', 'invoice', 'supporting')),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists university_contract_documents_contract_id_idx
  on public.university_contract_documents(contract_id, created_at desc);

alter table public.university_contracts enable row level security;
alter table public.university_contract_documents enable row level security;

insert into storage.buckets (id, name, public)
values ('university-contract-documents', 'university-contract-documents', false)
on conflict (id) do update set public = false;

