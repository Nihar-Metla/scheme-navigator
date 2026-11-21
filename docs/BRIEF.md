# Haq Scholar — Project Brief (authoritative)

**Status:** S0 consolidated brief, 21 November 2026.
**Sources:** `docs/slice0-brief.md` and `docs/s0-approval.md`. Where they differ, `s0-approval.md` takes precedence.
**Maintenance:** This brief is the persistent project context. Do not expand it with new decisions. Record each decision as a dated entry in `docs/decisions/`, then update the affected section here.
**Deadline:** Build deadline 22 November 2026, 11:59 PM IST.

---

## 1. Product and audience

**Haq Scholar** is a mobile-first web app that helps students from low-income families in Telangana, India find government scholarships they are likely eligible for.

A student describes their situation in plain language (Telugu, Hindi or English) and receives:

- scholarships they are likely eligible for, with the rule behind every match
- a personalised document checklist
- step-by-step application instructions with official links
- application tracking and in-app deadline reminders
- the official source and last-verified date for every scheme

**Audience:** students from Class 9 to postgraduate. For the demo, UG and PG are prioritised; other levels stay supported.

**Scheme sources (public information only):**
- Telangana ePASS: https://telanganaepass.cgg.gov.in/
- National Scholarship Portal: https://scholarships.gov.in/

---

## 2. Student journey (all 10 steps, in order)

MVP priority path = steps 1–7. Steps 8–10 are secondary.

| # | Step | Priority |
|---|---|---|
| 1 | Student types their situation in one text box (no long form). | MVP |
| 2 | AI extracts profile attributes and shows them as editable chips. | MVP |
| 3 | App asks at most 3 follow-up questions, only for missing fields that would change a verdict. | MVP |
| 4 | A deterministic rules engine evaluates every scheme. | MVP |
| 5 | Results are grouped: Likely eligible / Check one thing / Not eligible. | MVP |
| 6 | Each result explains every applicable rule: expected condition, actual value, PASS / FAIL / UNKNOWN. | MVP |
| 7 | Scheme detail: personalised document checklist and step-by-step apply guide. | MVP |
| 8 | Student saves and tracks applications (Saved → Docs ready → Applied → Verified → Sanctioned). | Secondary |
| 9 | In-app banner reminds about deadlines within 7 days. | Secondary |
| 10 | Admin page edits scheme rules, deadlines and last-verified dates; results update without code changes. | Secondary |

Note: step 6 shows PASS / FAIL / UNKNOWN per applicable rule. NOT APPLICABLE rules are not listed as results (see §4).

---

## 3. Non-negotiable guardrails

1. Never say "guaranteed". Use "likely eligible" or "check one thing".
2. Never collect or store Aadhaar, bank account, phone or certificate numbers. No document uploads.
3. Never store the original raw student description.
4. Never log raw user input or sensitive identifiers. Do not log sensitive information during debugging.
5. Strip 12-digit Aadhaar-like numbers before any extraction request, before either extraction path.
6. Never transmit unsanitised user input to external AI services.
7. Persist only the extracted, permitted profile attributes (§5).
8. AI only interprets input and extracts attributes. AI never decides eligibility.
9. Eligibility is deterministic and rule-based. Missing information is UNKNOWN, never FAIL.
10. Scheme rules and profile fields are editable data, not hard-coded logic.
11. Every scheme shows its official source URL, last-verified date and verification status. Unverified or conflicting information is never shown as confirmed, and never presented as a confirmed eligibility requirement.
12. Test and demo with fictional profiles only. Do not use real student personal information.
13. Do not upload or store student documents.
14. Free for students. No payments or institutional dashboards in the MVP.

---

## 4. Eligibility engine

The engine is a **pure module**: no UI, no database access, no AI. It takes a profile and loaded rule data and returns a verdict. It is independently testable.

### 4.1 Evaluation steps

1. Load rules from data.
2. For each rule, check `applies_when`. If it does not match, the rule is **NOT APPLICABLE** and is skipped.
3. For each applicable rule, return PASS, FAIL or UNKNOWN with the expected condition and actual value.
4. Compute the scheme verdict (§4.3).

### 4.2 Result states

| Result | Meaning | Example |
|---|---|---|
| **PASS** | Rule applies and the profile value satisfies the condition. | Category = BC, rule `eq BC` |
| **FAIL** | Rule applies and the profile value violates a verified condition. | Income 3,00,000 vs `lte 2,00,000` |
| **UNKNOWN** | Rule applies, but a required profile value is missing **or** the rule is unverified or conflicting. | Income not provided; or SC income rule with status `conflicting` |
| **NOT APPLICABLE** | The rule's `applies_when` does not match, so the rule is skipped and does not affect the verdict. | Rural-only rule for a student in an urban area |

**NOT APPLICABLE is distinct from UNKNOWN.**
- NOT APPLICABLE: the rule's `applies_when` does not match. The rule is skipped entirely.
- UNKNOWN: the rule applies, but the engine cannot decide because a required profile value is missing, or because the rule's verification_status is `unverified` or `conflicting`.

### 4.3 Scheme verdict

| Condition over applicable rules | Verdict |
|---|---|
| All applicable rules PASS | **LIKELY ELIGIBLE** |
| No FAIL, but one or more UNKNOWN | **CHECK ONE THING** |
| Any applicable rule FAIL | **NOT ELIGIBLE** |

Missing information never produces FAIL.

### 4.4 Per-rule output

Every applicable rule returns:

| Field | Content |
|---|---|
| `rule_id` | Rule identifier |
| `expected_condition` | Operator and value, e.g. `lte 200000` |
| `actual_value` | Profile value used (or null if missing) |
| `result` | PASS / FAIL / UNKNOWN |
| `verification_status` | verified / conflicting / unverified |
| `explanation` | Plain-language sentence for a Class 8 reader |

Verdict wording must never be "guaranteed" or equivalent.

---

## 5. Data model

Verification is **per rule**. A scheme's status is a rollup of its rules.

| Entity | Fields | Notes |
|---|---|---|
| **schemes** | id, name, provider (State / Central), state, portal_url, official_source_url, benefit_summary, apply_start, deadline, deadline_note, last_verified_on, verification_status, status | `verification_status` is a rollup of the scheme's rules. Proposed rollup (Member A to confirm): any `conflicting` rule → `conflicting`; else any `unverified` rule → `unverified`; else `verified`. `status` supports the state column (expandability through data). |
| **rules** | id, scheme_id, field, operator, value (JSON), label, applies_when (JSON, optional), **verification_status** (verified / conflicting / unverified), **source_evidence** (official source references supporting the rule), **last_verified_on** (date) | Operators: `eq`, `in`, `lte`, `gte`, `between`. |
| **documents** | id, scheme_id, name, tip, applies_when | Drives the personalised checklist. |
| **steps** | id, scheme_id, order, description, official_link | Apply guide. |
| **fields** | key, type, label, localized_question, applicable_conditions | Profile field definitions. Data, not code. |
| **profiles** | session_id, org_id (nullable), extracted attributes, language | Anonymous session id in localStorage. |
| **applications** | id, session_id, org_id (nullable), scheme_id, status, next_action, due_date, updated_at | Status: Saved → Docs ready → Applied → Verified → Sanctioned. |
| **rule_edits** | id, scheme_id, change, edited_at | Audit log for admin edits. |

### 5.1 Initial profile attributes (11)

category, annual_income, area, course_level, year_of_study, age, gender, disability, domicile_state, previous_marks_percentage, is_renewal.

### 5.2 MVP extraction scope (6 only)

MVP extraction covers **only**:

| Attribute | Notes |
|---|---|
| category | e.g. SC, ST, BC, OC, Minority |
| annual_income | Annual family income |
| area | rural / urban |
| course_level | e.g. UG, PG, Class 9 |
| year_of_study | |
| age | |

The other five attributes (gender, disability, domicile_state, previous_marks_percentage, is_renewal) remain in the data model but are not extracted in the MVP. Rules needing them evaluate to UNKNOWN until a later slice.

---

## 6. Extraction

- **Provider-independent interface.** The app calls an extraction interface; the implementation can change later.
- **MVP path: deterministic minimal English fallback.** No external key needed. This is the path to build first.
- **LLM adapter: only if** an application-level API key and a supported integration are both available. Nexen's own model configuration does not provide application-level credentials. The MVP must not depend on obtaining an external AI key.
- **Sanitisation runs before either path**, including the deterministic parser. Strip 12-digit Aadhaar-like numbers first.
- **Output:** extracted attributes shown as editable chips. The student corrects them before the engine runs.
- **Tests (required):** verify that sensitive input is neither transmitted to an external service nor persisted. Verify that the raw description is not stored or logged.

---

## 7. Seeded schemes (5)

| # | Scheme | Provider | Source | Seed status |
|---|---|---|---|---|
| 1 | Telangana Post-Matric Scholarship — BC | State (TS) | Telangana ePASS | Seed |
| 2 | Telangana Post-Matric Scholarship — SC | State (TS) | Telangana ePASS | Seed; **income rule conflicting** |
| 3 | Telangana Pre-Matric Scholarship — ST | State (TS) | Telangana ePASS | Seed |
| 4 | Telangana CM Overseas Scholarship | State (TS) | Telangana ePASS | Seed |
| 5 | One NSP central scheme | Central | National Scholarship Portal | Seed; **Member B to choose the name** |

Member B collects official sources and supporting evidence. Member A validates eligibility conditions before the engine uses them.

### 7.1 Known data issues

- **SC Post-Matric income threshold conflict:** sources state ₹2 lakh and ₹2.5 lakh.
  - The income rule is recorded with `verification_status = conflicting`.
  - It evaluates to **UNKNOWN**.
  - Neither threshold is chosen. Do not pick one arbitrarily.
- **Rural limit ₹1.5 lakh** (cited in test profile 3): **UNVERIFIED**. Not a confirmed condition. Shown as unverified.

---

## 8. Fictional test profiles

All six are fictional. Each expected outcome is an **expected scenario, not a verified determination.**

1. "I'm 19, first-year BSc in a village in Nalgonda, BC-B, family income around ₹1.2 lakh." → likely TS Post-Matric (BC) match. *Expected scenario, not a verified determination.*
2. "Second-year B.Tech in Hyderabad, SC, family income ₹2.3 lakh." → CHECK ONE THING while the SC income limit is unresolved (sources say ₹2L or ₹2.5L). *Expected scenario, not a verified determination.*
3. "BC-D, ₹1.8 lakh, rural, pursuing a degree." → NOT ELIGIBLE if the rural limit is ₹1.5L. *Expected scenario, not a verified determination.* The ₹1.5L limit is UNVERIFIED.
4. "Class 9, ST, from Adilabad, parents are labourers." → possible Pre-Matric match. *Expected scenario, not a verified determination.*
5. "Minority, age 27, BCom with 64%, wants MS abroad." → possible CM Overseas Scholarship match. *Expected scenario, not a verified determination.*
6. "OC, income ₹1 lakh, Intermediate first year." → no category match; point to the EBC route, do not invent eligibility. *Expected scenario, not a verified determination.*

Do not treat any threshold as official until it is verified.

---

## 9. Module ownership

| Area | Owner | Scope |
|---|---|---|
| Data model, seed loading, migrations | **Member A** | schemas, seed data, DB access |
| Eligibility engine and tests | **Member A** | `server/src/engine` |
| AI / deterministic extraction and sanitisation | **Member A** | `server/src/ai` |
| All APIs | **Member A** | `server/src/api` |
| shared/ (types, API contracts, base fixtures, theme, locales) | **Member A** | changed only by Member A |
| Deployment | **Member A** | |
| Home screen and Profile review UI | **Member A** | `client/src/home` |
| Admin backend (APIs, data, rule-management logic) | **Member A** | `server/src/api`, `server/src/db` |
| Results screen | **Member B** | `client/src/results` |
| Scheme detail, checklist, apply guide | **Member B** | `client/src/scheme` |
| Application tracker | **Member B** | `client/src/tracker` |
| Reminder banner | **Member B** | `client/src/tracker` |
| Admin UI (screens, forms, interactions) | **Member B** | `client/src/admin` |
| Scheme source and evidence collection | **Member B** | |

Member B builds against Member A's APIs and the shared fixtures. Frontend and backend responsibilities stay separate.

---

## 10. Folder layout and design

```
/
├── client/                 Vite + React (Member A: home, Member B: the rest)
│   └── src/
│       ├── home/
│       ├── results/
│       ├── scheme/
│       ├── tracker/
│       ├── admin/
│       ├── theme/          one theme file (design tokens)
│       └── locales/        en, te, hi (same keys)
├── server/                 Express (Member A)
│   └── src/
│       ├── engine/        pure eligibility engine
│       ├── api/
│       ├── ai/            extraction interface, deterministic fallback, sanitiser
│       └── db/
├── shared/                 types, API contracts, base fixtures (Member A only)
└── docs/
    ├── BRIEF.md
    └── decisions/
```

- No per-module README files unless a specific need arises.
- Shared files are changed only by Member A.
- **Locales:** en, te, hi share the same keys. te and hi use English placeholder values for now.
- **Theme:** one theme file. All design tokens live there.
- **Design:** minimalist. One primary action per screen. One accent colour. One typeface. 360px width first (mobile-first). 48px minimum tap targets. Plain language a Class 8 student understands.
- **Expandability through data:** schemes have a state column; profile fields live in the fields table; reminders go through one `notify()` function (in-app banner first); profiles and applications have a nullable `org_id`.

**Avoid:** microservices, caching, user accounts, complex auth, extra infrastructure, premature abstractions, features outside the journey.

---

## 11. Stack (provisional)

| Layer | Choice | Status |
|---|---|---|
| Frontend | React + Vite | Provisionally accepted |
| Backend | Node.js + Express | Provisionally accepted |
| Database | PostgreSQL | Provisionally accepted |
| Hosting | To be decided | **Deferred. Not part of S0.** |
| Codebenders capabilities (ACE Context Layer, Nexen, Business Logic Editor, API Factory, Design Studio, Agentic Testing) | Usable in this project? | **To confirm.** Do not treat any capability as fact until verified. |

Use the simplest implementation compatible with the Codebenders environment. Use platform-native capabilities only when they clearly cut effort without breaking the guardrails.

Open capability questions (to confirm):
- Can the Business Logic Editor handle conditional rules, multiple operators and UNKNOWN values with per-rule explanations, editable without code? If not fully, use a custom engine (current plan).
- Can two members work on the same project at once? If yes, how are conflicts avoided? If not, use exclusive editing windows.

---

## 12. Working method

**KNOW → PLAN → APPROVAL → BUILD → PROVE → CHECKPOINT**, one slice at a time.

- **KNOW:** summarise current state and affected parts.
- **PLAN:** list affected screens, APIs, tables and rules. Wait for approval.
- **BUILD:** only the approved scope.
- **PROVE:** run tests, including all earlier tests.
- **CHECKPOINT:** record decisions in `docs/decisions/`.

If something fails twice: stop, state the exact error and expected behaviour, and propose a revised plan.

**Post-S0 MVP slice order:** Student input → Profile extraction/review → Eligibility engine → Results → Scheme details.

**Token budget:** 8M credits per member for the whole hackathon. Keep tasks small and file-specific. Reuse contracts and fixtures. Avoid repository-wide analysis. Prefer focused tests; run the full suite only at integration checkpoints.

**Priority order:** working app → correct, explainable matching → plain-language input → guidance → tracking → reminders → editable rules → deployment and presentation.

**Stretch goals (must not delay the MVP journey):** voice input, full Telugu UI, PDF export.

---

## 13. S0 scope

S0 covers structure, contracts, fixtures, theme and locale skeletons, engine **interfaces** and a contract test skeleton. S0 contains **no** evaluation logic.

- Basic project structure
- Shared types and API contracts; request/response schemas
- Mock fixtures for frontend development (covering all three verdicts and the SC conflict)
- Theme tokens and locale skeleton (en, te, hi)
- Engine interfaces and test skeleton

---

## 14. Open items

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Hosting target | Member A | Open. Deferred from S0. Check Codebenders deployment capability and alternatives. Deploy early. |
| 2 | SC Post-Matric income threshold (₹2L vs ₹2.5L) | Member A with Member B evidence | Open. Rule stays `conflicting` → UNKNOWN until resolved from official sources. |
| 3 | ₹1.5 lakh rural limit (test profile 3) | Member B (evidence), Member A (validation) | Open. Currently UNVERIFIED. |
| 4 | NSP central scheme choice (seed #5) | Member B | Open. |
| 5 | No OC scheme in the seed set | — | Known gap. Profile 6 points to the EBC route only; no invented eligibility. |
| 6 | No AI API key | Member A | Open. MVP uses the deterministic fallback path only. |
| 7 | Whether the `a-core` / `b-ui` branch workflow is safe in the IDE | Both | Open. Until confirmed: avoid simultaneous edits to shared files, coordinate contract changes, use exclusive editing windows if needed. No CI pipeline. CODEOWNERS optional. |
