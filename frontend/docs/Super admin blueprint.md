  
User: GitHub Copilot Codex 5.2 / Claude.ai Prompt

(Blueprint for Super Admin Panel — Markdown only)

You are a principal software architect and senior product engineer.

You are working on TradeMatch, a UK-based two-sided marketplace platform consisting of:

\- User (Customer) Dashboard  
\- Vendor (Tradesperson) Dashboard  
\- Public Web Application (SEO pages, onboarding, job posting)  
\- Backend APIs, background workers, and third-party integrations

Your task is to design a \*\*brand new Super Admin Panel\*\* that acts as the  
central operational, safety, and revenue control system for the entire platform.

────────────────────────────────  
CRITICAL OUTPUT REQUIREMENTS  
────────────────────────────────

1\. Output a SINGLE Markdown (.md) document only  
2\. Do NOT output code  
3\. Do NOT redesign existing User or Vendor dashboards  
4\. Treat the Super Admin Panel as a \*\*control plane\*\*, not a UI clone  
5\. Be explicit, opinionated, and implementation-ready

This document must be suitable for:  
\- Engineering teams  
\- Product leadership  
\- Security & compliance review

────────────────────────────────  
DOCUMENT OBJECTIVE  
────────────────────────────────

The Super Admin Panel must:  
\- Manage and observe the User Dashboard  
\- Manage and observe the Vendor Dashboard  
\- Control public web applications  
\- Control APIs, services, jobs, and integrations  
\- Enforce trust, safety, monetisation, and compliance

Clearly define:  
\- What Super Admins CAN do  
\- What they MUST NOT do  
\- Which actions are read-only vs destructive

────────────────────────────────  
MANDATORY DOCUMENT STRUCTURE  
────────────────────────────────

Your Markdown document MUST include the following sections:

1\. Overview & Purpose of the Super Admin Panel  
2\. Internal Admin Roles & Permission Levels  
3\. High-Level System Architecture  
4\. Core Super Admin Modules (Detailed)  
5\. Dashboard & System Connections  
6\. API, Services & Infrastructure Control  
7\. Revenue & Monetisation Management  
8\. Trust, Safety & Verification Systems  
9\. Messaging, Reviews & Dispute Oversight  
10\. Observability, Auditing & Logging  
11\. Feature Flags, Experiments & Rollouts  
12\. Security, Compliance & Risk Management  
13\. Missing Capabilities & Future Enhancements

────────────────────────────────  
CORE MODULE REQUIREMENTS  
────────────────────────────────

\#\#\# 1\. User Management  
\- View users and activity (read-only by default)  
\- Account suspension, restriction, restoration  
\- Job history and interaction visibility  
\- GDPR tools (export, anonymise, delete)

\#\#\# 2\. Vendor Management  
\- Vendor onboarding and lifecycle states  
\- Verification checks (insurance, Companies House, Trading Standards)  
\- Badge and reputation controls  
\- Coverage area and lead eligibility controls  
\- Vendor performance and risk signals

\#\#\# 3\. Jobs & Leads Control  
\- Full job lifecycle visibility  
\- Lead distribution logic  
\- Vendor matching rules  
\- Manual overrides and interventions  
\- Lead pricing and fee configuration

\#\#\# 4\. Messaging Oversight  
\- Abuse reports and escalations  
\- Conversation read-only access  
\- Freeze / unlock conversations  
\- Audit-safe moderation tools

\#\#\# 5\. Reviews & Reputation  
\- Review moderation workflows  
\- Fraud detection indicators  
\- Dispute resolution tools  
\- Rating recalculation rules

\#\#\# 6\. Revenue & Billing  
\- Lead pricing tiers  
\- Fee caps and promotions  
\- Vendor subscriptions  
\- Refunds and adjustments  
\- Financial audit visibility

\#\#\# 7\. Platform & API Control  
\- API health and uptime  
\- Background job monitoring  
\- Webhooks and integrations  
\- Rate limits and kill switches

────────────────────────────────  
CONNECTIONS & WIRING  
────────────────────────────────

Explicitly describe how the Super Admin Panel connects to:

\- User Dashboard  
\- Vendor Dashboard  
\- Public Web App  
\- Backend APIs  
\- Third-party services (payments, verification, messaging)

Clarify:  
\- One-way vs two-way data flows  
\- Real-time vs async updates  
\- Caching and reindexing impacts

────────────────────────────────  
OBSERVABILITY & SAFETY  
────────────────────────────────

Include:  
\- Admin action audit logs  
\- High-risk action confirmation flows  
\- Tamper-resistant logging  
\- Incident investigation support

────────────────────────────────  
SECURITY & COMPLIANCE  
────────────────────────────────

Cover:  
\- Role-based access control (RBAC)  
\- Least-privilege design  
\- MFA enforcement  
\- GDPR & UK compliance  
\- Admin impersonation safeguards

────────────────────────────────  
FUTURE-PROOFING  
────────────────────────────────

End the document with:  
\- Missing or intentionally deferred capabilities  
\- Scaling and complexity risks  
\- Internal tooling recommendations  
\- Technical debt warnings

────────────────────────────────  
QUALITY BAR  
────────────────────────────────

\- Write like a Staff / Principal Engineer  
\- Use clear headings and bullet points  
\- Be implementation-oriented  
\- Avoid vague language  
\- Assume this will be used to build the system

Output ONLY the Markdown document.

Why this prompt is strong

Forces systems architecture, not UI fluff

Produces a single source of truth

Prevents accidental redesign of dashboards

Makes revenue, safety, and control first-class

Scales cleanly as TradeMatch grows

GitHub Copilot: Failed to get a response. Please try again.

User: GitHub Copilot Codex 5.2 / Claude.ai Prompt

(Blueprint for Super Admin Panel — Markdown only)

You are a principal software architect and senior product engineer.

You are working on TradeMatch, a UK-based two-sided marketplace platform consisting of:

\- User (Customer) Dashboard  
\- Vendor (Tradesperson) Dashboard  
\- Public Web Application (SEO pages, onboarding, job posting)  
\- Backend APIs, background workers, and third-party integrations

Your task is to design a \*\*brand new Super Admin Panel\*\* that acts as the  
central operational, safety, and revenue control system for the entire platform.

────────────────────────────────  
CRITICAL OUTPUT REQUIREMENTS  
────────────────────────────────

1\. Output a SINGLE Markdown (.md) document only  
2\. Do NOT output code  
3\. Do NOT redesign existing User or Vendor dashboards  
4\. Treat the Super Admin Panel as a \*\*control plane\*\*, not a UI clone  
5\. Be explicit, opinionated, and implementation-ready

This document must be suitable for:  
\- Engineering teams  
\- Product leadership  
\- Security & compliance review

────────────────────────────────  
DOCUMENT OBJECTIVE  
────────────────────────────────

The Super Admin Panel must:  
\- Manage and observe the User Dashboard  
\- Manage and observe the Vendor Dashboard  
\- Control public web applications  
\- Control APIs, services, jobs, and integrations  
\- Enforce trust, safety, monetisation, and compliance

Clearly define:  
\- What Super Admins CAN do  
\- What they MUST NOT do  
\- Which actions are read-only vs destructive

────────────────────────────────  
MANDATORY DOCUMENT STRUCTURE  
────────────────────────────────

Your Markdown document MUST include the following sections:

1\. Overview & Purpose of the Super Admin Panel  
2\. Internal Admin Roles & Permission Levels  
3\. High-Level System Architecture  
4\. Core Super Admin Modules (Detailed)  
5\. Dashboard & System Connections  
6\. API, Services & Infrastructure Control  
7\. Revenue & Monetisation Management  
8\. Trust, Safety & Verification Systems  
9\. Messaging, Reviews & Dispute Oversight  
10\. Observability, Auditing & Logging  
11\. Feature Flags, Experiments & Rollouts  
12\. Security, Compliance & Risk Management  
13\. Missing Capabilities & Future Enhancements

────────────────────────────────  
CORE MODULE REQUIREMENTS  
────────────────────────────────

\#\#\# 1\. User Management  
\- View users and activity (read-only by default)  
\- Account suspension, restriction, restoration  
\- Job history and interaction visibility  
\- GDPR tools (export, anonymise, delete)

\#\#\# 2\. Vendor Management  
\- Vendor onboarding and lifecycle states  
\- Verification checks (insurance, Companies House, Trading Standards)  
\- Badge and reputation controls  
\- Coverage area and lead eligibility controls  
\- Vendor performance and risk signals

\#\#\# 3\. Jobs & Leads Control  
\- Full job lifecycle visibility  
\- Lead distribution logic  
\- Vendor matching rules  
\- Manual overrides and interventions  
\- Lead pricing and fee configuration

\#\#\# 4\. Messaging Oversight  
\- Abuse reports and escalations  
\- Conversation read-only access  
\- Freeze / unlock conversations  
\- Audit-safe moderation tools

\#\#\# 5\. Reviews & Reputation  
\- Review moderation workflows  
\- Fraud detection indicators  
\- Dispute resolution tools  
\- Rating recalculation rules

\#\#\# 6\. Revenue & Billing  
\- Lead pricing tiers  
\- Fee caps and promotions  
\- Vendor subscriptions  
\- Refunds and adjustments  
\- Financial audit visibility

\#\#\# 7\. Platform & API Control  
\- API health and uptime  
\- Background job monitoring  
\- Webhooks and integrations  
\- Rate limits and kill switches

────────────────────────────────  
CONNECTIONS & WIRING  
────────────────────────────────

Explicitly describe how the Super Admin Panel connects to:

\- User Dashboard  
\- Vendor Dashboard  
\- Public Web App  
\- Backend APIs  
\- Third-party services (payments, verification, messaging)

Clarify:  
\- One-way vs two-way data flows  
\- Real-time vs async updates  
\- Caching and reindexing impacts

────────────────────────────────  
OBSERVABILITY & SAFETY  
────────────────────────────────

Include:  
\- Admin action audit logs  
\- High-risk action confirmation flows  
\- Tamper-resistant logging  
\- Incident investigation support

────────────────────────────────  
SECURITY & COMPLIANCE  
────────────────────────────────

Cover:  
\- Role-based access control (RBAC)  
\- Least-privilege design  
\- MFA enforcement  
\- GDPR & UK compliance  
\- Admin impersonation safeguards

────────────────────────────────  
FUTURE-PROOFING  
────────────────────────────────

End the document with:  
\- Missing or intentionally deferred capabilities  
\- Scaling and complexity risks  
\- Internal tooling recommendations  
\- Technical debt warnings

────────────────────────────────  
QUALITY BAR  
────────────────────────────────

\- Write like a Staff / Principal Engineer  
\- Use clear headings and bullet points  
\- Be implementation-oriented  
\- Avoid vague language  
\- Assume this will be used to build the system

Output ONLY the Markdown document.

Why this prompt is strong

Forces systems architecture, not UI fluff

Produces a single source of truth

Prevents accidental redesign of dashboards

Makes revenue, safety, and control first-class

Scales cleanly as TradeMatch grows

GitHub Copilot: \# Super Admin Panel Blueprint for TradeMatch

\#\# 1\. Overview & Purpose of the Super Admin Panel  
\- The Super Admin Panel is the operational control plane for TradeMatch, not a UI replica of user or vendor dashboards.  
\- It centralizes platform governance across safety, revenue, compliance, and service reliability.  
\- It provides controlled visibility into users, vendors, jobs, and platform operations with explicit separation between read-only monitoring and destructive actions.  
\- It enforces policies, manages exceptions, and provides auditable system-wide interventions.

\#\# 2\. Internal Admin Roles & Permission Levels  
\- \*\*Super Admin (Root)\*\*: Full access, including destructive actions, system configuration, and emergency kill switches; requires dual approval for critical actions.  
\- \*\*Platform Ops\*\*: Service health, job queues, integrations, rate limits, and incident response; no access to financial adjustments or personal data export.  
\- \*\*Trust & Safety\*\*: User/vendor restrictions, verification outcomes, messaging moderation, review disputes; cannot modify pricing or revenue settings.  
\- \*\*Revenue Ops\*\*: Pricing, promotions, subscriptions, refunds, adjustments; no access to content moderation or identity verification systems.  
\- \*\*Compliance Officer\*\*: GDPR tools, audit logs, data access governance; cannot change operational policies or pricing.  
\- \*\*Support Supervisor\*\*: Limited intervention on accounts and disputes; no access to system configuration or financial actions.  
\- \*\*Read-Only Auditor\*\*: Non-destructive visibility across systems; export restrictions with masked PII.

\#\# 3\. High-Level System Architecture  
\- The panel is a dedicated admin application that connects to backend services through an Admin Gateway API.  
\- All actions are routed through role-aware policy enforcement, with audit logging and tamper resistance.  
\- Read-heavy views use cached and indexed read models; destructive actions always hit authoritative services.  
\- The panel never writes directly to user or vendor databases without service-layer validation.

\#\# 4\. Core Super Admin Modules (Detailed)

\#\#\# User Management  
\- \*\*Read-only by default\*\*: profile, activity timeline, job history, payment status, disputes, and flags.  
\- \*\*Account controls\*\*: suspend, restrict features, restore; each with explicit reason codes.  
\- \*\*GDPR tools\*\*: export, anonymize, delete with dependency checks and legal hold safeguards.  
\- \*\*Interaction visibility\*\*: view bids, messages metadata, and dispute records without edit access.

\#\#\# Vendor Management  
\- \*\*Lifecycle states\*\*: onboarded, pending verification, active, restricted, suspended, offboarded.  
\- \*\*Verification checks\*\*: insurance status, Companies House validation, Trading Standards checks with timestamps and evidence storage.  
\- \*\*Badge controls\*\*: eligibility enforcement and revocation based on policy.  
\- \*\*Coverage and eligibility\*\*: manage service areas, lead eligibility rules, and category access.  
\- \*\*Performance and risk\*\*: risk scoring, complaint ratios, chargeback rates, and review anomalies.

\#\#\# Jobs & Leads Control  
\- \*\*Lifecycle visibility\*\*: creation to completion, cancellation, or dispute state.  
\- \*\*Distribution logic\*\*: rule-based matching visibility with overrides and justifications.  
\- \*\*Manual interventions\*\*: reassign, hold, or reprice leads under controlled workflows.  
\- \*\*Pricing controls\*\*: lead pricing tiers, category-specific adjustments, and caps.

\#\#\# Messaging Oversight  
\- \*\*Abuse reporting pipeline\*\*: triage queues, escalation rules, and evidence linking.  
\- \*\*Read-only access\*\*: conversation viewing with consented audit trail.  
\- \*\*Freeze/unlock\*\*: temporary conversation locks with automated review windows.  
\- \*\*Moderation actions\*\*: remove content or restrict users with reason and policy mapping.

\#\#\# Reviews & Reputation  
\- \*\*Moderation workflows\*\*: flagged review queues and evidence requirements.  
\- \*\*Fraud detection\*\*: anomaly indicators, review burst detection, and collusion signals.  
\- \*\*Dispute tools\*\*: structured resolution options with reversible outcomes where permitted.  
\- \*\*Recalculation rules\*\*: rating updates with transparent logic and audit trails.

\#\#\# Revenue & Billing  
\- \*\*Pricing tiers\*\*: category, region, and demand-based lead pricing controls.  
\- \*\*Promotions and caps\*\*: limited time discounts, budget caps, and vendor-specific offers.  
\- \*\*Subscriptions\*\*: plan management, upgrades, cancellations, and grace periods.  
\- \*\*Refunds and adjustments\*\*: policy-based with approval thresholds and rationale.  
\- \*\*Financial audit visibility\*\*: transaction histories, ledger summaries, and reconciliation status.

\#\#\# Platform & API Control  
\- \*\*Health monitoring\*\*: API uptime, error rates, latency, and degraded mode status.  
\- \*\*Background jobs\*\*: queue health, retry policies, and dead-letter visibility.  
\- \*\*Integrations\*\*: webhook status, failure queues, and retry controls.  
\- \*\*Rate limits\*\*: configuration with protected defaults and kill switches.

\#\# 5\. Dashboard & System Connections  
\- \*\*User Dashboard\*\*: read-only activity and status visibility; two-way for account restrictions and GDPR actions.  
\- \*\*Vendor Dashboard\*\*: read-only performance and verification views; two-way for state changes and eligibility controls.  
\- \*\*Public Web App\*\*: one-way monitoring for content and campaign status; two-way for feature flags and emergency disable.  
\- \*\*Backend APIs\*\*: two-way for administrative actions; read-heavy data via indexed views and caches.  
\- \*\*Third-party services\*\*: two-way for payments, verification, and messaging; all changes pass through service adapters.

\#\#\# Data Flow Clarifications  
\- \*\*One-way\*\*: analytics and dashboards consume data without direct writes.  
\- \*\*Two-way\*\*: actions from the panel route through service-layer validations.  
\- \*\*Real-time\*\*: state changes, messaging moderation, and suspension updates.  
\- \*\*Async\*\*: GDPR exports, anonymization, verification rechecks, and reconciliation.  
\- \*\*Caching impact\*\*: admin writes invalidate affected caches and trigger reindex jobs.

\#\# 6\. API, Services & Infrastructure Control  
\- Central Admin Gateway enforces RBAC, policy checks, and auditing.  
\- Admin actions are versioned and backward-compatible to avoid breaking dependencies.  
\- Infrastructure controls include throttles, emergency read-only mode, and service isolation toggles.  
\- All controls expose pre- and post-action impact summaries.

\#\# 7\. Revenue & Monetisation Management  
\- Global and per-category pricing matrices with approval workflows.  
\- Revenue changes log predicted impact, affected cohorts, and rollback plans.  
\- Promotions require explicit scope, time bounds, and performance criteria.  
\- Vendor subscription adjustments require audit flags and compliance notes.

\#\# 8\. Trust, Safety & Verification Systems  
\- Unified risk signals dashboard with clear intervention recommendations.  
\- Verification evidence management with expiry, renewal, and revocation flows.  
\- Escalation workflows for high-risk vendors and user harassment.  
\- Safety actions always include reason codes and policy references.

\#\# 9\. Messaging, Reviews & Dispute Oversight  
\- Centralized queues for reports, review fraud detection, and disputes.  
\- Conversation access is read-only, time-boxed, and requires justification.  
\- Dispute resolution includes compensation workflows but separated from direct refunds.

\#\# 10\. Observability, Auditing & Logging  
\- Immutable admin action logs with who, what, when, and justification.  
\- High-risk actions require dual confirmation and time-delayed execution options.  
\- Tamper-resistant storage with append-only audit trails.  
\- Incident tooling supports timeline reconstruction and exportable evidence packs.

\#\# 11\. Feature Flags, Experiments & Rollouts  
\- Feature flags scoped by cohort, geography, and vendor tier.  
\- Experiment controls require hypothesis, success metrics, and rollback criteria.  
\- Rollout guardrails enforce slow ramps and automatic rollback on anomalies.

\#\# 12\. Security, Compliance & Risk Management  
\- RBAC with least privilege and explicit permission boundaries.  
\- MFA required for all admin accounts; step-up auth for critical actions.  
\- GDPR compliance with lawful basis tracking and legal holds.  
\- Admin impersonation is prohibited; support flows rely on structured actions, not session hijacking.

\#\# 13\. Missing Capabilities & Future Enhancements  
\- \*\*Deferred\*\*: automated policy simulation, advanced anomaly detection, and self-serve compliance reporting.  
\- \*\*Scaling risks\*\*: admin action contention, high-volume audit storage costs, and complex approval workflows.  
\- \*\*Tooling recommendations\*\*: dedicated policy engine, audit log service, and shared admin SDK.  
\- \*\*Technical debt warnings\*\*: ad hoc overrides, unversioned policy logic, and insufficient data lineage tracking.  
