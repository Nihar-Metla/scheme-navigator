# 003 — S3: Scheme seed data and matching API (approved 22 Nov 2026)

## Goal
Expose the existing eligibility engine over HTTP, backed by editable JSON seed data. No database yet.

## Ground rules
- The engine in `server/src/engine/evaluate.ts` is the single source of truth. The API must not duplicate or re-implement eligibility logic.
- Use the types in `shared/types.ts` and the shapes in `shared/contracts.ts`. If anything below conflicts with them, the existing shared files win. Do not modify `shared/`; report any mismatch instead.
- Use enum values exactly as defined in `shared/types.ts` (e.g. `"CLASS_9"`).
- No new runtime dependencies unless unavoidable. Tests use Node's built-in `fetch` against an app started on a random port.

## Files
| File | Purpose |
|---|---|
| `server/src/db/schemes.json` | Seed data for 5 schemes (editable data, no code) |
| `server/src/db/load.ts` | Loads and validates `schemes.json` at startup; fails fast with a clear error if a required field is missing |
| `server/src/api/app.ts` | `createApp({ schemes })` — schemes are injected; default loads the seed. Registers routes |
| `server/src/api/routes/schemes.ts` | `GET /api/schemes`, `GET /api/schemes/:id` |
| `server/src/api/routes/match.ts` | `POST /api/match` |
| `server/test/api.test.ts` | API tests with injected test schemes |
| `server/test/seed.test.ts` | Validates the real seed file |

## Endpoints

### `GET /api/health`
`200 { "ok": true }`

### `GET /api/schemes`
`200` — array of scheme summaries: id, name, provider, state, benefit_summary, deadline, deadline_note, status, official_source_url, last_verified_on, verification_status.

### `GET /api/schemes/:id`
`200` — full scheme including rules, documents and steps.
`404 { "error": "Scheme not found" }` for an unknown id.

### `POST /api/match`
Request: `{ "attributes": { ...profile attributes } }`
- `attributes` must be an object, otherwise `400`.
- Known numeric fields (annual_income, age, year_of_study) must be numbers if present, otherwise `400`.
- Known enum fields must use valid values if present, otherwise `400` naming the field.
- Unknown keys are ignored. Any other top-level body fields (e.g. raw text) are ignored and never stored, echoed or logged.
- Missing attributes are allowed; the engine treats them as UNKNOWN.

Response `200`:
```json
{
  "results": [
    {
      "scheme": { "...summary fields as in GET /api/schemes" },
      "verdict": "LIKELY_ELIGIBLE | CHECK_ONE_THING | NOT_ELIGIBLE",
      "explanation": "optional",
      "rule_results": [ "...exactly as returned by the engine" ]
    }
  ]
}
```
Sort order: LIKELY_ELIGIBLE, then CHECK_ONE_THING, then NOT_ELIGIBLE; within a group, by scheme name.

Errors: `400 { "error": "<message>" }`. Never include the request body in errors or logs.

### Logging and privacy
No middleware, route, exception handler or diagnostic statement may log or echo request bodies or raw student descriptions. `/api/match` ignores unexpected fields and never persists them. Request logging, if any, records only method, path (without query string), status and duration.

## Seed data (`schemes.json`)
Five schemes:
1. `ts-pms-bc` — Telangana Post-Matric Scholarship (BC/EBC)
2. `ts-pms-sc` — Telangana Post-Matric Scholarship (SC)
3. `ts-prematric-st` — Telangana Pre-Matric Scholarship (ST)
4. `ts-cm-overseas-minorities` — CM Overseas Scholarship for Minorities
5. `nsp-central-post-matric` — one NSP central post-matric scheme (Member B to choose and source)

Each scheme: id, name, provider (`State` / `Central`), state, portal_url, official_source_url, benefit_summary, apply_start, deadline (nullable), deadline_note, last_verified_on (nullable), verification_status, status, rules[], documents[], steps[].

- `status` is the scheme's operational/application status only: `active`, `inactive` or `not_announced`. It never describes evidence verification.
- Scheme-level `verification_status` is a display summary derived from its rules, computed in `load.ts` (not hand-entered): `conflicting` if any rule is conflicting; otherwise `unverified` if any rule is unverified; otherwise `verified`. A scheme with an empty rules array fails seed validation (it can never be `verified`). Rule-level status remains authoritative for evaluation.

Each rule: id, field, operator, value, label, applies_when (optional), verification_status, source_evidence, last_verified_on.

Each document: id, name, tip, applies_when (optional).
Each step: order, description, official_link.

### Verification policy
- Every rule starts as `unverified` with `source_evidence: null`, except the SC income rule.
- SC income rule: `verification_status: "conflicting"`, value null, source_evidence noting the ₹2,00,000 vs ₹2,50,000 conflict.
- Verification is per rule. A scheme's portal or official_source_url never verifies its rules. Each `verified` rule needs its own `source_evidence` (official URL plus the exact supporting wording) and its own `last_verified_on`.
- Member B collects official URLs and the exact eligibility wording. Member A changes a rule to `verified` only with that evidence.
- Never change a threshold or status to produce a particular demo result. Demo evidence must be real: Likely eligible = all applicable rules verified and passing; Check one thing = at least one applicable rule UNKNOWN; Not eligible = at least one verified applicable rule fails.
- Target: BC category and BC rural/urban income rules researched by 10:30 AM. Whatever cannot be verified stays unverified.
- Deadlines for 2026-27 are not announced on TS ePASS: `deadline: null`, `deadline_note: "Not yet announced. Check the official portal."`

### Starting rule values (to be verified)
- BC: category in BC groups and EBC; income ≤ 150000 when area is rural; income ≤ 200000 when area is urban; course level is post-matric (Class 11 to PG); domicile is Telangana.
- SC: category is SC; income limit conflicting; course level is post-matric; domicile is Telangana.
- Pre-Matric ST: category is ST; course level is Class 9 or 10; domicile is Telangana; income rule unverified.
- CM Overseas (Minorities): category is Minority; age ≤ 30; course level is PG (abroad).
- NSP scheme: chosen and sourced by Member B.

### Documents and steps
Common TS ePASS documents: passport photo, student Aadhaar card (uploaded on the official portal only; this app never asks for the number), bank passbook first page, SSC hall ticket details, caste certificate (MeeSeva), income certificate (MeeSeva, dated after 1 April 2026), college bonafide, previous marks memos.
Steps: 4–6 per scheme, each linking to the official portal.

## Tests

### `api.test.ts` (injected test schemes, not the real seed)
- `GET /api/health` returns ok.
- `GET /api/schemes` returns all injected schemes as summaries, and the list response contains no `rules`, `documents` or `steps` arrays.
- Scheme-level verification_status is derived correctly: any conflicting rule gives conflicting; otherwise any unverified gives unverified; otherwise verified.
- `GET /api/schemes/:id` returns the full scheme; unknown id returns 404.
- `POST /api/match` with profiles 1, 2, 3 and 6 from `shared/fixtures/profiles.ts` returns the same verdicts the engine returns for the same data (call `evaluate` directly in the test and compare).
- Results are sorted by verdict group, then name.
- Non-object `attributes` gives 400; a string income gives 400; an invalid enum gives 400 naming the field.
- A body with an extra `text` field containing a 12-digit number: the response does not contain that text or number.
- Missing attributes give CHECK_ONE_THING, not NOT_ELIGIBLE.

### `seed.test.ts` (real seed file)
- Exactly 5 schemes with unique ids.
- Every scheme has official_source_url and verification_status.
- Every rule has verification_status in {verified, conflicting, unverified}.
- Every `verified` rule has its own non-null source_evidence and last_verified_on.
- Every scheme `status` is one of active, inactive, not_announced.
- The SC income rule is `conflicting`.
- Every scheme has at least one rule; a test seed with an empty rules array is rejected by `load.ts`.
- The word "guaranteed" does not appear anywhere in the seed.

## Out of scope for S3
Extraction, client screens, applications/tracker, admin, database, deployment.

## Implementation notes (dated)
Date: 2026-11-22

1. The endpoint is `POST /api/evaluate` and returns the `groups` response from `shared/contracts.ts` (`likely_eligible`, `check_one_thing`, `not_eligible`, plus `follow_up_questions`). It does not use `/api/match` or a `results` array.
2. Summaries follow `SchemeSummary` exactly, so `status` and `deadline_note` are omitted from summaries and detail responses. Both are kept in the seed and validated by `load.ts`.
3. `explanation` is omitted from results because the contract has no field for it. Adding it is a follow-up.
4. The seed has four schemes. The NSP central scheme is pending Member B's source, so it is not in the seed yet. Adding it later needs only a data change in `schemes.json`.
5. Domicile rules are omitted because `ProfileAttributes` has no domicile field, so no rule can check it.
6. Document `applies_when` is not returned by the API.
