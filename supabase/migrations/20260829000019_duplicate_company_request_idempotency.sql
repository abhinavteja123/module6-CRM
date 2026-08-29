-- Keep one approval workflow per existing company while allowing an approved
-- request to create a second company record later.

-- Consolidate duplicate pending rows created before this constraint existed.
with ranked as (
  select
    id,
    row_number() over (
      partition by university_id, existing_organization_id
      order by created_at asc, id asc
    ) as request_rank
  from public.duplicate_company_requests
  where status = 'pending'
)
update public.duplicate_company_requests as requests
set
  status = 'rejected',
  review_note = coalesce(requests.review_note, 'Consolidated into the original pending approval request.'),
  reviewed_at = coalesce(requests.reviewed_at, now())
from ranked
where requests.id = ranked.id
  and ranked.request_rank > 1;

create unique index if not exists duplicate_company_requests_one_pending_idx
  on public.duplicate_company_requests(university_id, existing_organization_id)
  where status = 'pending';
