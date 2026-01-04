# Agents (Codex)

## Product goal

Build a lightweight Decision & Approval Log for SMB IT/Ops teams.
Replace the fragile "Google Doc decision log" + "decision summary emails" workflow with a structured, searchable ledger.

## ICP

IT/Ops managers in SMBs (20–200 employees) who need traceability (CYA, audits, handovers).

## MVP scope (STRICT)

Only:

-   Decision log list with filters + search
-   Create decision (title, decision, context, approvers, optional links)
-   Decision detail page with immutable audit trail
-   Approve / Reject with optional comment
-   Email notifications (request approval + outcome)
-   Basic team/workspace concept (one workspace per org)

Explicitly NOT in MVP:

-   No workflow engine
-   No Slack/Jira integrations
-   No dashboards/analytics
-   No AI features
-   No complex role hierarchy

## UX principles

-   No sidebar, max width ~720px, calm minimal UI
-   “Boring beats clever”
-   Create a decision in under 2 minutes
-   Search decisions in under 10 seconds

## Roles

-   Workspace Admin: manage members
-   Member: create decisions, view all decisions
-   Approver: can approve/reject decisions they are assigned to
-   a memeber can be an approvaer as well and vice versa

## Pages

-   / (Decision Log)
-   /decisions/new
-   /decisions/[id]
-   /settings/members (minimal)

## Data model (Supabase Postgres)

Tables:

-   workspaces(id, name, created_at)
-   workspace_members(id, workspace_id, user_id, role, created_at)
-   decisions(
    id, workspace_id, title, summary, context,
    owner_user_id, status, created_at, updated_at
    )
-   decision_approvers(
    id, decision_id, approver_user_id, status, decided_at
    )
-   decision_comments(
    id, decision_id, user_id, body, created_at
    )
-   decision_links(
    id, decision_id, label, url, created_at
    )
-   decision_events(
    id, decision_id, type, actor_user_id, metadata_json, created_at
    )

Status enums:

-   decisions.status: 'pending' | 'approved' | 'rejected'
-   decision_approvers.status: 'pending' | 'approved' | 'rejected'

Audit trail rules (NON-NEGOTIABLE)

-   No editing past events
-   All actions create decision_events rows
-   Title/summary/context can be edited ONLY while decision.status = 'pending' and BEFORE any approver acts
    (optional; can skip edit entirely for MVP)

## Email notifications

Use a simple server-side email provider (Resend recommended) OR Supabase Edge Functions.
Emails:

-   "Decision – <title>": request approval + deep link
-   "Approved/Rejected – <title>": notify owner + approvers

## Acceptance criteria (MVP)

1. User can create workspace (or auto-create on signup) and invite members by email.
2. Member creates decision with 1+ approver.
3. Approver receives email and can approve/reject.
4. Decision status updates automatically based on approver statuses:
    - If any approver rejects => decision rejected
    - If all approvers approve => decision approved
5. Decision log supports search by title and filter by status.
6. Decision detail shows immutable timeline of actions (created, approval requested, approved/rejected).
7. RLS prevents cross-workspace access.

## Engineering constraints

-   TypeScript
-   Server actions where appropriate
-   Use Supabase Auth
-   Use RLS for all tables
-   Minimal shadcn/ui components for clean UI

## Reddit Validation Learnings

-   Market segmentation:
    -   Ticket-first teams: need decision receipts that reference tickets; do not replace tickets.
    -   Email-first teams: decision email ritual is sticky; tool must be as fast as sending that email.
    -   Mature ITIL/CAB and disciplined PM orgs: not early ICP.
    -   Ownership skeptics: success requires explicit owner + required approvers.
    -   Compliance/retention: need immutable record and printable artifact.
-   Pain themes: retrieval later, authority proof, fragmentation across tools.
-   ICP lock: SMB IT/Ops managers (20–200) without CAB, using tickets and/or email rituals.

# Pricing tiers:

## Principles:

-   Price per workspace, not per decision or per approval
-   Free tier exists to replace Google Docs/email and build trust
-   Paid tiers unlock durability, retrieval, and audit confidence

## FREE (Personal/Trial):

    - 1 workspace
    - Up to 3 users
    - Up to 10 decisions total (or last 30 days only)
    - Email approvals included
    - No PDF/print export
    - No decision superseding

## PRO ($29/month per workspace):

    - 1 workspace
    - Up to 10 users
    - Unlimited decisions
    - Email decision summaries (content-rich)
    - PDF/print-friendly decision view
    - Related ticket/document links
    - Decision superseding
    - Full immutable audit trail

## PRO+ ($59/month):

    - Up to 5 workspaces
    - Up to 50 users total
    - All Pro features
    - Simple workspace switcher

## MVP Refinements

-   MUST:
    -   Email subject format: “Decision – {Title}”.
    -   Email body includes summary, context, and deep link.
    -   Print/PDF-friendly decision view.
    -   Owner captured automatically; approvers required.
-   SHOULD:
    -   Related ticket/doc link + optional ticket ID field (no integration).
-   LATER:
    -   Supersedes decision relation.
    -   Outcome status (implemented/postponed/canceled).
-   Positioning:
    -   Decision receipt/ledger, not a workflow engine or ITIL/Jira replacement.
