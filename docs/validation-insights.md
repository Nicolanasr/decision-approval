# Reddit Validation Insights

## Market segmentation (6 worlds)
- Ticket-first teams (ITSM/Jira): approvals live in tickets; pain is cross-ticket decisions and post-closure retrieval.
  - Implication: we are a decision receipt layer, not a ticket replacement.
  - Requirement: optional related ticket/doc link fields.
- Email-first teams: the “Decision – <title>” email is the ritual.
  - Implication: app must feel as fast as sending an email.
  - Requirement: emails include summary, context, and deep link (not just a notification).
- Mature ITIL/CAB orgs: already solved by CAB/change register; not early ICP.
  - Implication: borrow language lightly (supersedes, outcome status) but avoid governance workflow.
- Ownership/culture skeptics: tools fail without a clear owner.
  - Implication: reduce burden for owner, make ownership explicit.
  - Requirement: owner captured automatically; approvers required.
- Compliance/retention orgs: chat approvals violate retention policies.
  - Implication: immutable records and printable artifacts.
  - Requirement: print/PDF-friendly view for external retention (SharePoint/drive).
- Disciplined PM orgs: already have Jira/spec discipline; not early adopters.

## Real pain themes (what we solve)
- Retrieval later (handovers, audits, “why did we decide this?”)
- Authority proof (who approved)
- Fragmentation (Slack/Notion/email/tickets drifting)

## ICP lock (early)
- Primary ICP: IT/Ops managers in SMBs (20–200) without formal CAB, needing traceability (CYA, audits, handovers), already using tickets and/or email rituals.

## Outcome
We win by reducing retrieval + authority proof + fragmentation with minimal effort, not by adding governance or integrations.
