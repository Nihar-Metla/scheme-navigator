# How we built Haq Scholar with Codebenders and Nexen

This file records the key prompts we sent to Nexen, what Nexen did, and what we decided after reviewing its output.

**About the prompt text:** prompts marked **"As sent"** were drafted before sending and pasted into Nexen; the copy in Nexen's History is the original record. Prompts marked **"Summary"** describe the request because the exact text was not saved.

## Working method

Every slice followed **Know → Plan → Prove**:
1. A short design file in `docs/decisions/` before the slice.
2. A new Nexen chat per slice, naming only the files to read (to save context and credits).
3. Nexen proposed a plan and raised questions; we approved or changed it before any file was written.
4. One editor agent limited to named files, then one tester agent.
5. We re-ran tests and builds ourselves before every commit.

---

## S0: Architecture discovery and project foundation

**Prompt (As sent):** we added the project brief (`docs/slice0-brief.md`) and the approval notes (`docs/s0-approval.md`) to the repo, then sent:

> Read docs/slice0-brief.md and docs/s0-approval.md. Where they differ, s0-approval.md takes precedence. In S0, consolidate them into docs/BRIEF.md and docs/decisions/001-architecture.md. The consolidated brief must keep: all 10 steps of the student journey; the full data model, with rules extended by verification_status (verified/conflicting/unverified), source_evidence and last_verified_on; the distinction between UNKNOWN and NOT APPLICABLE; the 6 fictional test profiles. Do not create or modify any files yet. Include an outline of docs/BRIEF.md in the S0 plan, then wait for my approval.

**What Nexen did:** listed where the two documents differed and applied the approval's version, proposed the BRIEF outline, folder structure and file plan, and flagged blockers (hosting, unresolved SC income limit, no application-level AI key).

**What we decided:** cut S0 to about an hour (no per-module READMEs, no lint setup); changed the folder layout to `client/`, `server/` and `shared/` so it builds cleanly; made the senior developer own the shared base fixtures so frontend work could start against mock data.

---

## S2: Deterministic eligibility engine

**Prompt (As sent, opening):**

> S2 — Eligibility Engine. Read only: shared/types.ts, shared/contracts.ts, shared/fixtures/base.ts, shared/fixtures/profiles.ts, server/src/engine/types.ts, server/src/engine/evaluate.ts … Implement evaluate.ts as a pure, independently testable function … Evaluation precedence: 1. Non-matching applies_when → NOT_APPLICABLE. 2. Conflicting or unverified rule → UNKNOWN. 3. Missing required profile value → UNKNOWN. 4. Otherwise evaluate the rule … If no rules apply, return CHECK_ONE_THING with the explanation "No applicable rules could be evaluated."

**What Nexen did:** asked four design questions before editing: the shape of `applies_when`, FAIL vs UNKNOWN precedence, where to put the explanation, and permission to read `package.json`.

**What we decided:** `applies_when` accepts one condition or an AND-list (needed for course-and-category age caps); FAIL beats UNKNOWN. We saved the approved design as `docs/decisions/002-engine-design.md` so later chats could read it instead of relying on chat history.

**Iteration:** the first editor runs could not write files. We resolved it by turning off plan mode and approving writes through Nexen's confirmation card. Result: 26/26 tests passing, verified by us in our own terminal.

---

## S3: Scheme data and matching API

**Prompt (As sent, opening):**

> S3: scheme seed data and matching API. Read only: docs/decisions/003-api-and-seed.md, shared/types.ts, shared/contracts.ts … Implement exactly what 003-api-and-seed.md specifies. If it conflicts with shared/types.ts or shared/contracts.ts, the shared files win; report the mismatch instead of changing shared/.

**What Nexen did:** found 6 mismatches between our design and the shared contracts. The most important: the contract defined `POST /api/evaluate` with grouped results, not `POST /api/match`.

**What we decided:** kept the shared contract as the source of truth (`/api/evaluate`); follow-up questions come only from rules that are verified and missing a value, never from unverified, conflicting or not-applicable rules; no placeholder NSP scheme (a fake scheme would look like real data).

---

## S4a: Input sanitiser and keyword extraction

**Prompt (As sent, opening):**

> S4a: input sanitiser, keyword extractor and POST /api/extract … Pay particular attention to the "Additional correctness requirements" and the sanitiser rules: no plain \d{9,} replacement, remove whole sequences, and never confuse age with income. Show a short plan first (files, contract mismatches, the sanitiser approach in one sentence) and wait for approval.

**What Nexen did:** proposed a sanitiser that removes whole 9+ digit sequences, including ones split by spaces or hyphens, while keeping formatted income like ₹1,20,000. It also flagged that the contract's response includes a `sanitised` field.

**What we decided:** confirmed `sanitised` is a yes/no flag, so the response never echoes the student's text; kept the existing `[REDACTED]` placeholder so earlier tests stayed valid; supplied the six test sentences directly instead of having Nexen read the long brief.

---

## S7: Application tracker and deadline reminders

**Prompt (As sent, opening):**

> S7: application tracker and deadline reminders (client only) … One entry per scheme_id … Read defensively: if the stored value is not valid JSON or not an array, start from an empty list without crashing … Compute days left from the browser's local calendar date (compare dates at local midnight, not timestamps) …

**What Nexen did:** planned storage, the tracker screen, the reminder banner and navigation. It proposed a new uppercase status type.

**What we decided:** reuse the existing lowercase `ApplicationStatus` from `shared/types.ts` instead of creating a duplicate; keep banner dismissal in memory only (stores less data). Official 2026-27 deadlines are not announced, so students set their own deadline to drive reminders.

---

## Final test-only review

**Prompt (As sent, opening):**

> Act strictly as a test engineer and reviewer. Do not modify any files … Review: 1. Raw student text is never logged, stored, persisted to localStorage, or returned by any API. 2. The sanitiser runs before every extraction path. 3. The word "guaranteed" does not appear anywhere … 4. Every verified rule in schemes.json has source_evidence and last_verified_on. 5. localStorage keys used by the client store only attributes, checked document indexes and tracker fields.

**What Nexen reported:** 75/75 server tests passing and both type-checks passing. All five privacy and integrity checks passed, with file and line references, and no defects found.

---

## Other slices (summaries)

- **S4b (Summary):** Home, profile review with editable chips, and the Results screen with "Why?" explanations.
- **S5 (Summary):** scheme detail with a document checklist (saved as ticked indexes only), application steps and readable labels. Nexen spotted that `ResultsScreen.tsx` also needed a small change to wire "View details"; we approved that one extra file.
- **S6 (Summary):** single-service deployment. Express serves the built client, unknown `/api` paths return JSON 404s, and tests use a temporary build folder.
- **Explanation wording (Summary):** student-friendly rule explanations, with eligibility logic unchanged.
- **Last-reviewed date (Summary):** each scheme shows when it was last reviewed, without implying every rule is verified.

## What we did by hand, and why

- **Eligibility data:** rules in `server/src/db/schemes.json` were verified against official Telangana ePASS pages, with the exact wording quoted. Scheme facts must come from official sources, not from AI.
- **Verification:** we re-ran every test and build ourselves and checked each feature in a phone-sized browser before committing.
- **Deployment:** configured on Render. Codebenders publishing is listed as "coming soon".