# SLICE 0 — PROJECT CONTEXT & ARCHITECTURE DISCOVERY (NO IMPLEMENTATION)

## 1. Project
**Haq Scholar** — a mobile-first web app that helps students from low-income families in Telangana, India find government scholarships they are likely eligible for.

A student describes their situation in plain language (Telugu, Hindi or English) and gets:
- scholarships they are likely eligible for, with the rule behind every match
- a personalised document checklist
- step-by-step application instructions with official links
- application tracking and in-app deadline reminders
- the official source and last-verified date for every scheme

Audience: students from Class 9 to postgraduate. For the demo, prioritise UG and PG while keeping other levels supported.
Scheme sources (public information only): Telangana ePASS https://telanganaepass.cgg.gov.in/ and National Scholarship Portal https://scholarships.gov.in/

## 2. Core journey
1. Student types their situation in one text box (no long form).
2. AI extracts profile attributes and shows them as editable chips.
3. App asks at most 3 follow-up questions, only for missing fields that would change a verdict.
4. A deterministic rules engine evaluates every scheme.
5. Results are grouped: Likely eligible / Check one thing / Not eligible.
6. Each result explains every applicable rule: expected condition, actual value, PASS / FAIL / UNKNOWN.
7. Scheme detail: personalised document checklist and step-by-step apply guide.
8. Student saves and tracks applications (Saved → Docs ready → Applied → Verified → Sanctioned).
9. In-app banner reminds about deadlines within 7 days.
10. Admin page edits scheme rules, deadlines and last-verified dates; results update without code changes.

## 3. Non-negotiable guardrails
- Never say "guaranteed". Use "likely eligible" or "check one thing".
- Never collect or store Aadhaar, bank account, phone or certificate numbers. No document uploads.
- Never store the original raw user description.
- Never log raw user input or sensitive identifiers.
- Strip 12-digit Aadhaar-like numbers before sending input to the AI extraction service.
- Never transmit unsanitised user input to external AI services.
- Persist only the extracted, permitted profile attributes.
- AI only interprets input and extracts attributes. It never decides eligibility.
- Eligibility is deterministic and rule-based. Missing information is UNKNOWN, never FAIL.
- Scheme rules and profile fields are editable data, not hard-coded logic.
- Every scheme shows its official source URL, last-verified date and verification status. Unverified or conflicting information is never shown as confirmed.
- Test and demo with fictional profiles only.
- Free for students. No payments or institutional dashboards in the MVP.

## 4. Technical direction (preferences, not requirements)
- React frontend, Node.js/Express API, PostgreSQL or the database Codebenders supports best.
- Responsive web app, designed mobile-first (360px width first).
- AI profile extraction through a Codebenders-supported AI integration.
- Anonymous session id in localStorage. No login for students; simple passcode for admin.
- Recommend simpler options if Codebenders has native capabilities that save effort without breaking the guardrails.

**Design: minimalist.** One primary action per screen, one accent colour, one typeface, 48px tap targets, plain language a Class 8 student understands. All design tokens in a single theme file. All UI strings in locale files (en, te, hi), even if only English is filled at first.

**Expandability through data, not code.** Schemes have a state column. Profile fields live in a fields table. Reminders go through one notify() function (in-app banner first). Profiles and applications have a nullable org_id. The eligibility engine is a pure, independently testable module, separate from AI extraction.

**Avoid:** microservices, caching, user accounts, complex auth, extra infrastructure, premature abstractions, features outside this journey.

## 5. Team setup and module boundaries
We are a team of two working in parallel, and one person's changes must not break the other's work.

- **Member A (senior):** data model, seed data loading, eligibility engine, AI extraction, all APIs, shared files (theme, locales, types), deployment, Home and Profile review screens.
- **Member B (mid-level):** Results screen, Scheme detail (checklist and apply guide), My applications tracker, reminder banner, Admin rules editor UI. All built against Member A's APIs.

Admin ownership:
- Member A owns the admin backend, APIs, data model and business logic.
- Member B owns the admin UI, including screens, forms and frontend interactions.
- Member B consumes Member A's APIs. Frontend and backend responsibilities must remain separate.

Please structure the project so that:
- each module lives in its own folder with a clear owner (for example /engine, /api, /ai, /ui/home, /ui/results, /ui/scheme, /ui/tracker, /ui/admin, /shared)
- API request and response shapes are agreed first, so Member B can build against mock data before the real APIs exist
- shared files are changed only by Member A
- tests protect each module's contract

## 6. Data model to evaluate (do not implement yet)
- **schemes:** id, name, provider (State/Central), state, portal_url, official_source_url, benefit_summary, apply_start, deadline, deadline_note, last_verified_on, verification_status, status
- **rules:** id, scheme_id, field, operator (eq, in, lte, gte, between), value (JSON), label, applies_when (JSON, optional)
- **documents:** id, scheme_id, name, tip, applies_when
- **steps:** id, scheme_id, order, description, official_link
- **fields:** key, type, label, localized_question, applicable_conditions
- **profiles:** session_id, org_id (nullable), extracted attributes, language
- **applications:** id, session_id, org_id (nullable), scheme_id, status, next_action, due_date, updated_at
- **rule_edits:** id, scheme_id, change, edited_at (audit log for admin edits)

Initial profile attributes: category, annual_income, area, course_level, year_of_study, age, gender, disability, domicile_state, previous_marks_percentage, is_renewal.

## 7. Eligibility engine
1. Load rules from data.
2. Skip rules whose applies_when does not match (NOT APPLICABLE). Keep this separate from UNKNOWN.
3. Return PASS, FAIL or UNKNOWN per applicable rule, with expected condition and actual value.
4. Verdict: all PASS → LIKELY ELIGIBLE; no FAIL but some UNKNOWN → CHECK ONE THING; any FAIL → NOT ELIGIBLE.
5. Deterministic, explainable, testable without the UI or the AI.

## 8. Fictional test profiles (expected scenarios, not verified determinations)
1. "I'm 19, first-year BSc in a village in Nalgonda, BC-B, family income around ₹1.2 lakh." → likely TS Post-Matric (BC) match.
2. "Second-year B.Tech in Hyderabad, SC, family income ₹2.3 lakh." → CHECK ONE THING while the SC income limit is unresolved (sources say ₹2L or ₹2.5L).
3. "BC-D, ₹1.8 lakh, rural, pursuing a degree." → NOT ELIGIBLE if the rural limit is ₹1.5L.
4. "Class 9, ST, from Adilabad, parents are labourers." → possible Pre-Matric match.
5. "Minority, age 27, BCom with 64%, wants MS abroad." → possible CM Overseas Scholarship match.
6. "OC, income ₹1 lakh, Intermediate first year." → no category match; point to the EBC route, do not invent eligibility.

Do not treat any threshold as official until we verify it.

## 9. Codebenders capabilities
For each of: ACE Context Layer, Nexen, Business Logic Editor, API Factory, Design Studio, Agentic Testing, tell us:
- whether you can use it in this project, and where it is in the IDE
- what it would do for Haq Scholar
- what still needs custom implementation

Mark anything you are not certain of as "to confirm". Do not describe capabilities you cannot verify.

Specifically answer:
- Can the Business Logic Editor handle conditional rules, multiple operators and UNKNOWN values with per-rule explanations, editable without code? If not fully, recommend a custom engine.
- Can two team members work in this project at the same time? If yes, how do we avoid conflicts? If not, what is the safest way to split work?
- How do we keep this brief as the persistent project context, and update it when decisions change?

## 10. Working method for every slice
KNOW (summarise current state and affected parts) → PLAN (list affected screens, APIs, tables, rules) → wait for our approval → BUILD only the approved scope → PROVE (run tests, including all earlier tests) → CHECKPOINT.
If something fails twice, stop, state the exact error and expected behaviour, and propose a revised plan.

## 11. Time
Build deadline: 22 November 2026, 11:59 PM IST. A deployed, working version must exist early. Priorities: working app → correct, explainable matching → plain-language input → guidance → tracking → reminders → editable rules → deployment and presentation. Stretch goals: voice input, full Telugu UI, PDF export.

## 12. Your response (no implementation)
Do not write code, create files, generate UI or change the project. Keep the response under 900 words and use tables where possible.

A. Your understanding in 5 lines
B. Proposed architecture and folder structure, with module owners
C. Capability table (section 9) with the three specific answers
D. Top 5 risks
E. Implementation slices in order, each tagged Member A or Member B, showing which can run in parallel
F. Decisions you need from us, each with a recommended default
G. Honest feasibility before the deadline

Wait for our review and explicit approval before starting.