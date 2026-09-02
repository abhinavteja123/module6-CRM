-- Track the amount paid separately from payment status so the remaining balance
-- can be calculated consistently in the API and the Super Admin dashboard.

alter table public.university_contracts
  add column if not exists amount_paid numeric(14,2) not null default 0
  check (amount_paid >= 0);

alter table public.university_contracts
  drop constraint if exists university_contracts_amount_paid_lte_total;

alter table public.university_contracts
  add constraint university_contracts_amount_paid_lte_total
  check (amount_paid <= total_contract_value);
