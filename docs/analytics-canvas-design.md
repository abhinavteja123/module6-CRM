# Analytics Canvas Design

Date: 2026-08-29

## Understanding summary

- The analytics workspace is used by University Admins and Data Analysts.
- It must remain usable when many placement managers, targets, companies, and updates exist.
- The page should tell a clear story: targets, critical work, pipeline, outcomes, comparisons, then details.
- A Cycle filter means the existing placement season/academic year and is the parent filter for the whole page.
- Filters must update KPIs, alerts, visuals, comparison tables, and the detail grid together.
- Long tables must be contained and scrollable without breaking the page layout.
- The page should provide essential placement analysis first and advanced analysis only where it supports a decision.

## Assumptions and non-functional requirements

- The existing `/api/placement/analytics` response remains the source of truth for the first iteration.
- Initial client-side filtering supports thousands of records per university; server-side aggregation can be added if data volume outgrows the browser view.
- Every visual has a readable text/table equivalent for accessibility.
- Analytics remains read-only; target and placement edits stay in their existing workflows.
- Role-scoped backend responses and identity protections are unchanged.
- Loading, empty, refresh, export, and error states remain available.

## Final design

The page uses a Power BI-style canvas with a compact global slicer bar at the top. The slicers are Cycle, Manager, Category, City, Pipeline Stage, Outlook, Drive Status, Date Range, and free-text search. Active filters are visible and can be removed individually; Reset all filters returns to the consolidated view.

The hero also provides an Ask analytics view. It accepts a plain-language question and sends the question plus the active slicers to the protected analytics query endpoint. The backend recomputes the filtered context, then uses the configured Groq model when available. A deterministic rules-based answer remains available when the model is not configured or a provider request fails. Answers are paragraph-first, read-only, advisory, and show the filtered record count plus any referenced records.

The visual flow is:

1. KPI strip: targets, actuals, achievement, and conversion.
2. Target delivery: progress by the active filter context.
3. Critical work: overdue follow-ups, upcoming drives, negative outlook, stalled records, and missing next actions.
4. Pipeline health: stage distribution with clickable stage filtering.
5. Outcomes: registered-to-joined funnel and conversion rates.
6. Comparisons: manager, category, city, and cycle panels.
7. Detail grid: contained scrollable records with expandable details.

Sections are compact and collapsible. Desktop keeps slicers visible; smaller screens use a Filters drawer. Charts remain CSS-based so the page has no new chart runtime dependency.

## Decision log

| Decision | Alternatives | Reason |
| --- | --- | --- |
| Use a Power BI-style canvas | Long report, separate tabs | Keeps context visible while reducing uncontrolled scrolling. |
| Make Cycle the parent slicer | Independent filters only | Matches the placement workflow and makes comparisons consistent. |
| Filter all visuals from one derived dataset | Filter only the detail grid | Prevents contradictory KPIs and tables. |
| Use collapsible sections and contained tables | More dense fixed tables | Improves scanning, mobile behavior, and large-team usability. |
| Keep charts CSS-based | Add a charting dependency | Lower maintenance and bundle risk for the required visuals. |
| Keep analytics read-only | Add editing to the canvas | Preserves responsibility boundaries and avoids accidental data changes. |
| Scope natural-language answers to the active slicers | Query the entire tenant regardless of the visible view | Keeps the answer explainable and prevents the query mode from contradicting the canvas below it. |
| Provide a deterministic fallback | Make the AI provider mandatory | Keeps local development and deployments without a provider key useful while remaining transparent to the admin. |
