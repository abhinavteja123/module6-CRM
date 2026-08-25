alter table public.organizations
  add column if not exists expected_ctc text;

alter table public.contacts
  drop column if exists expected_ctc;
