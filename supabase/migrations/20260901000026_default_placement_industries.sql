-- Give every existing university a useful starter industry catalog. University
-- admins can rename or extend these options from Placement Setup.

with starter_industries(name, description) as (
  values
    ('Information Technology', 'Software, IT services, and technology employers'),
    ('Consulting', 'Management, strategy, and professional services'),
    ('Finance & Banking', 'Banking, fintech, insurance, and financial services'),
    ('Healthcare', 'Healthcare, pharmaceuticals, and life sciences'),
    ('Manufacturing', 'Industrial, automotive, and engineering employers'),
    ('E-commerce & Retail', 'Online commerce, retail, and consumer businesses')
)
insert into public.placement_industries (university_id, name, description)
select universities.id, starter_industries.name, starter_industries.description
from public.universities as universities
cross join starter_industries
where not exists (
  select 1
  from public.placement_industries as existing
  where existing.university_id = universities.id
    and lower(trim(existing.name)) = lower(trim(starter_industries.name))
);
