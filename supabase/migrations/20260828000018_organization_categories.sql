alter table public.organizations
  add column if not exists category_id uuid references public.company_categories(id) on delete set null;

create index if not exists organizations_category_idx
  on public.organizations(university_id, category_id);
