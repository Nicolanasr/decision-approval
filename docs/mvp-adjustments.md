# MVP Adjustments (Reddit Validation)

## Must (MVP)

-   Email content includes summary, context, and deep link.
-   Email subject format: “Decision – {Title}”.
-   Print/PDF-friendly decision view (clean print page/button).
-   Owner captured automatically; approvers required.

## Should (near-term, still minimal)

-   Related ticket/document link field.
-   Optional ticket ID field (no integration or sync).

## Later (explicitly optional)

-   “Supersedes decision” relationship.
-   Outcome status (implemented / postponed / canceled).

## Constraints

-   No workflow governance.
-   No integrations (Slack/Jira/etc.).
-   No analytics dashboards.
-   No AI features.

## Next iteration tasks

-   [x] Add print-friendly decision view and print button.
-   [x] Ensure all decision emails use “Decision – {Title}” and include summary/context/deep link.
-   [ ] Add optional related ticket link + ticket ID fields to decisions.
-   [ ] Make owner and approver presence explicit on decision detail.
-   [ ] Tighten decision search to include ticket ID and related link.
