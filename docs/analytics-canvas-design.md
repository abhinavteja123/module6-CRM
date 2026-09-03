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
2. Comparisons: manager, category, industry, and city panels.
3. Target delivery: progress by the active filter context.
4. Manager target achievement: category-grouped Target and Achievement values for each manager.
5. Pipeline details: category-grouped Prospect, Positive, and Negative counts for each manager.
6. Category pipeline: target, tracked records, stage distribution, and outcomes.
7. Critical work: overdue follow-ups, upcoming drives, negative outlook, stalled records, and missing next actions.
8. Pipeline health: stage distribution with clickable stage filtering.
9. Outcomes: registered-to-joined funnel and conversion rates.
10. Detail grid: contained scrollable records with expandable details.

The manager target-achievement and pipeline-detail matrices are derived from the same filtered placement rows and admin-declared targets as the rest of the canvas. This keeps the reference-style cross-tabs synchronized with Cycle, Manager, Category, and the remaining global slicers.

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
| Send a relevant semantic analytics contract | Send the complete analytics response to Groq | Reduces input tokens, keeps authorization and calculations server-side, and makes the provider replaceable. |
| Use validated read-only operations selected from a semantic catalog | Allow arbitrary SQL or model-generated commands | Prevents data leakage and destructive actions while still supporting dynamic questions. |
| Limit AI output and preserve provider errors | Use large unconstrained completions and silent fallback | Controls token usage and makes context-limit failures diagnosable. |

## AI context contract

The analytics query path keeps the full analytics response inside FastAPI for deterministic calculations, then uses a tiny schema-only Groq planning request to select one validated, read-only semantic operation from the user's question: KPI summary, target progress, manager/category/industry/city comparison, company ranking, pipeline breakdown, or attention records. Only that operation's schema and compact result are sent to the final Groq answer request. Company rows are limited to the highest-priority records for attention questions and top-ranked records for ranking questions; meeting reports are not sent to the AI path.

The insights path sends only server-generated insight candidates and aggregate totals. Groq is used as a concise formatter/ranker, not as the calculator. Both paths cap generated tokens, request JSON output, validate references against authorized in-memory data, and fall back to the deterministic rules engine when Groq is unavailable or rejects the request. Provider status, input size, model, and response body are logged without exposing credentials.
