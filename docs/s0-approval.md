# HAQ SCHOLAR — ARCHITECTURE APPROVAL & S0 EXECUTION PLAN

## Context and deadline

We are building Haq Scholar for the ACE Builders Hackathon 2026.

- Current date: Saturday, 21 November 2026, 8:52 PM IST.
- Hard deadline: Sunday, 22 November 2026, 11:59 PM IST.
- Approximately 27 hours remain.
- Each team member has an allocation of only 8 million tokens/credits for the entire hackathon.
- The only available model is Haiku 5.5. Keep every task small, explicit and file-specific.
- We must prioritise a working, tested and deployed MVP while managing both time and token consumption carefully.

The architecture direction from your previous response is approved, subject to the amendments and constraints below. This document and `docs/slice0-brief.md` together are the authoritative project context.

---

## 1. Technology stack

Provisionally accept:

- Frontend: React + Vite.
- Backend: Node.js + Express.
- Database: PostgreSQL.

Use the simplest implementation compatible with the Codebenders environment. Prefer platform-native capabilities when they materially reduce development time without compromising our requirements.

Avoid unnecessary infrastructure and architectural complexity.

## 2. AI extraction strategy

AI is responsible only for interpreting the student's natural-language description and extracting profile attributes. It must never determine scholarship eligibility.

Implement a provider-independent extraction interface.

Initial approach:

1. Build a minimal deterministic English-language extraction fallback.
2. Support extraction of:
   - Category
   - Annual family income
   - Rural/urban location
   - Course
   - Year of study
   - Age
3. Allow students to review and correct extracted attributes through editable UI chips.
4. Integrate an LLM adapter only if an application-level API key and supported integration are available.
5. Keep the extraction interface provider-independent so the implementation can be changed later.

Important distinctions:

- Nexen's own model configuration does not provide application-level AI credentials.
- Do not make the MVP dependent on obtaining an external AI API key.
- Apply sanitisation before either the deterministic parser or an external AI service receives input.

## 3. Scheme data and verification

Seed the following five schemes:

1. Telangana Post-Matric Scholarship — BC.
2. Telangana Post-Matric Scholarship — SC.
3. Telangana Pre-Matric Scholarship — ST.
4. Telangana CM Overseas Scholarship.
5. One relevant National Scholarship Portal central scheme.

Member B will collect official sources and supporting evidence.

Member A will validate the eligibility conditions before they are used by the eligibility engine.

### Critical verification requirement

Verification status must exist at the individual rule level, not only at the scheme level.

Each eligibility rule must support:

- Verification status: verified, conflicting or unverified.
- Supporting official source evidence.
- Last-verified date.
- Expected eligibility condition.

For the SC Post-Matric scheme, the income threshold currently conflicts between ₹2 lakh and ₹2.5 lakh.

Do not choose either threshold arbitrarily.

The conflicting income rule must return UNKNOWN. It must not be evaluated as a confirmed eligibility condition.

The application must distinguish:

- PASS
- FAIL
- UNKNOWN
- NOT APPLICABLE

Missing profile information must never automatically become FAIL.

Unverified or conflicting conditions must never be presented as confirmed eligibility requirements.

---

## 4. Team responsibilities and ownership

We have two team members.

### Member A — Technical lead / Backend

Owns:

- Backend architecture and APIs.
- Database schema, migrations and seed data.
- Eligibility engine and tests.
- AI extraction and sanitisation.
- Shared types and API contracts.
- Home and Profile UI.
- Admin backend and business logic.
- Integration and deployment.

### Member B — Frontend lead

Owns:

- Results UI.
- Scheme details UI.
- Document checklist and application guide UI.
- Application tracker UI.
- Deadline reminder banner.
- Admin UI.
- Responsive frontend implementation and testing.
- Collection of official scheme sources and supporting evidence.

### Explicit frontend/backend separation

For the Admin module:

- Member A owns the backend, APIs, database operations and rule-management logic.
- Member B owns the frontend screens, forms and user interactions.
- Member B consumes Member A's APIs.

Maintain clear module ownership and avoid unnecessary overlapping changes.

---

## 5. Collaboration and repository

Use this single Git repository.

We intend to use separate branches per member (`a-core` and `b-ui`, merged into `main` at sync points), subject to confirming the workflow is safe in the IDE.

Until safe collaboration is established:

- Avoid simultaneous edits to shared files.
- Coordinate changes to shared contracts and types.
- Keep module ownership clear.
- Use exclusive editing windows if necessary.

CODEOWNERS is optional if it can be configured quickly. Do not introduce a CI pipeline or unnecessary repository automation.

---

## 6. Deployment

We will provide the hosting target after checking the available Codebenders deployment capability and alternatives.

Prioritise early deployment.

Do not wait until the final stage to discover hosting, environment-variable or database provisioning problems.

---

## 7. Privacy and security guardrails

These are non-negotiable:

- Never collect Aadhaar numbers, bank account numbers, phone numbers or certificate numbers.
- Never store the original raw student description.
- Never log raw user input or sensitive identifiers.
- Strip 12-digit Aadhaar-like numbers before any extraction request.
- Never transmit unsanitised input to external AI services.
- Persist only permitted extracted profile attributes.
- Do not upload or store student documents.
- Use fictional profiles for demonstrations and testing.
- Do not log sensitive information during debugging.
- Do not use real student personal information.

The extraction layer must have tests verifying that sensitive input is not transmitted or persisted.

---

## 8. Eligibility engine

The eligibility engine must be:

- Deterministic.
- Independent of the AI extraction implementation.
- Independent of UI components.
- Independent of database access.
- Driven by editable rule data.
- Independently testable.

For every applicable rule, return:

- Rule identifier.
- Expected condition.
- Actual profile value.
- Evaluation result: PASS, FAIL or UNKNOWN.
- Verification status.
- Explanation.

Rules that do not apply must be reported as NOT APPLICABLE.

Overall verdict:

- All applicable rules PASS → LIKELY ELIGIBLE.
- No FAIL but one or more UNKNOWN → CHECK ONE THING.
- Any applicable rule FAIL → NOT ELIGIBLE.

Never use guaranteed eligibility wording.

---

## 9. Implementation scope and priorities

Keep S0 minimal:

- Basic project structure.
- Shared types and API contracts.
- Request/response schemas.
- Mock fixtures for frontend development.
- Basic theme tokens.
- Minimal locale skeleton for English, Telugu and Hindi.
- Consolidated project context documents (see section 12).

After S0, prioritise this working vertical slice:

Student input → Profile extraction/review → Eligibility engine → Results → Scheme details.

This complete student journey is the MVP priority.

Secondary features:

- Document checklist and application guide.
- Saved applications and status tracking.
- In-app deadline reminders.
- Admin scheme and rule editing.

Stretch goals must not delay a working, deployed student journey.

---

## 10. Token/credit budget management

Each team member has only 8 million tokens/credits for the entire hackathon. Treat this as a strict resource constraint.

- Avoid unnecessary repository-wide analysis.
- Do not repeatedly rediscover or explain existing project context.
- Use `docs/BRIEF.md` and the specific files named in each task as context.
- Keep prompts and responses focused on the current implementation slice.
- Do not spawn agents or delegate tasks unless the expected benefit justifies the additional token consumption.
- Avoid full-file rewrites when targeted edits are sufficient.
- Reuse existing contracts, types, fixtures and implementation decisions.
- Prefer focused tests over repeatedly running the full test suite, except at integration checkpoints.
- If an implementation approach fails twice, stop and diagnose before attempting another approach.
- Keep reports concise: changed files, tests executed, results and unresolved issues.
- Avoid speculative exploration and unapproved features.

Before undertaking an expensive or broad task, briefly state why it is necessary and whether a cheaper alternative exists.

The goal is not to use every Nexen feature. The goal is to deliver the strongest working product within the available time and token budget.

---

## 11. Working method

Follow this sequence for every slice:

KNOW → PLAN → APPROVAL → BUILD → PROVE → CHECKPOINT.

Work one implementation slice at a time. Each new slice may start in a new chat that begins by reading `docs/BRIEF.md` and `docs/decisions/`.

Keep project context concise and update it when decisions change. Record each new decision as a short dated entry in `docs/decisions/` rather than expanding the brief.

---

## 12. Your immediate task — S0 planning only

Do not modify files or begin implementation yet.

First, inspect the workspace. It currently contains only `README.md`, `.gitignore`, `docs/slice0-brief.md` and this file. State clearly if anything differs.

Present a concise S0 implementation plan covering:

1. Proposed folder structure.
2. Files to create or modify.
3. Shared types and API contracts.
4. Mock fixture structure.
5. Theme and locale skeleton.
6. Ownership of each task (A/B).
7. Dependencies and potential conflicts.
8. Estimated implementation effort.
9. Relevant validation checks.
10. Any unresolved prerequisites or blockers.
11. Creation of `docs/BRIEF.md`, consolidating `docs/slice0-brief.md` and this document into one concise authoritative brief, plus `docs/decisions/001-architecture.md` recording these amendments.

Keep the plan focused. Do not perform unnecessary exploration or generate an extensive architectural document.

Wait for explicit approval before modifying files.

Our immediate objective is to complete S0 quickly and begin building the working student journey.

Do not expand scope or introduce additional architecture unless there is a clear and necessary MVP benefit.