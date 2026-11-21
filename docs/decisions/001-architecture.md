# 001 — Architecture decisions (S0)

**Date:** 21 November 2026

**Context:** S0 consolidation of `docs/slice0-brief.md` and `docs/s0-approval.md`. Where they differ, `s0-approval.md` takes precedence. Authoritative context: `docs/BRIEF.md`.

## Decisions

1. **Stack provisionally accepted:** React + Vite (frontend), Node.js + Express (backend), PostgreSQL (database). Hosting is deferred and is not part of S0.

2. **Extraction:** a provider-independent interface. The deterministic minimal English fallback is the MVP path. An LLM adapter is built only if an application-level API key and a supported integration are available. Sanitisation runs before either path.

3. **MVP extraction limited to six attributes:** category, annual_income, area (rural/urban), course_level, year_of_study, age. The other five profile attributes stay in the data model but are not extracted in the MVP.

4. **Verification is per rule.** Each rule carries verification_status (verified / conflicting / unverified), source_evidence and last_verified_on. A scheme's verification_status is a rollup of its rules.

5. **SC Post-Matric income conflict (₹2L vs ₹2.5L):** the rule is recorded as `conflicting` and evaluates to UNKNOWN. Neither threshold is chosen.

6. **NOT APPLICABLE is distinct from UNKNOWN.** NOT APPLICABLE means the rule's applies_when does not match, so the rule is skipped. UNKNOWN means the rule applies but a required value is missing, or the rule is unverified or conflicting. Missing information is never FAIL.

7. **shared/ is owned by Member A.** It holds types, API contracts and base fixtures. Shared files are changed only by Member A.

8. **Folder layout:**
   - `client/` (Vite + React): `src/home`, `src/results`, `src/scheme`, `src/tracker`, `src/admin`, `src/theme`, `src/locales`
   - `server/` (Express): `src/engine`, `src/api`, `src/ai`, `src/db`
   - `shared/` at repo root: types, API contracts, base fixtures

9. **Locales:** en, te, hi share the same keys. te and hi use English placeholder values for now. One theme file.

10. **S0 scope is limited** to project structure, shared contracts, fixtures, theme and locale skeletons, engine interfaces and a test skeleton. S0 contains no evaluation logic.

11. **Hosting is deferred** and decided separately.

12. **No per-module READMEs** unless a specific need arises.

13. **Tooling:** no lint setup. A build check (Vite build and TypeScript typecheck) is sufficient for S0.

## Open items

Tracked in `docs/BRIEF.md` §14: hosting target; SC threshold resolution; ₹1.5L rural limit verification; NSP scheme choice; no OC scheme in the seed set; no AI API key; branch workflow safety in the IDE.
