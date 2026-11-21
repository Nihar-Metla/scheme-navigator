# 002 — Eligibility engine design (S2, approved 21 Nov 2026)

## Scope
Pure function in server/src/engine/evaluate.ts. No AI, DB or UI imports.
Input: { attributes, rules } (EvaluateFn in server/src/engine/types.ts).
Output: { verdict, rule_results, explanation? } — add optional `explanation: string` to EngineOutput.
Use the Rule, RuleResult and profile types already defined in shared/types.ts. Do not modify shared/.

## Rule shape decisions
- `applies_when`: either one condition `{ field, operator, value }` or an array of them. Array = AND (all must match). Absent = always applies.
- `value` per operator:
  - eq: single value
  - in: array of values
  - lte / gte: number
  - between: [low, high], inclusive
- Each rule carries verification_status: verified | conflicting | unverified.

## Per-rule evaluation order
1. applies_when does not match → NOT_APPLICABLE
2. verification_status is conflicting or unverified → UNKNOWN
3. profile value missing, or rule value null → UNKNOWN
4. otherwise evaluate the operator → PASS or FAIL

Each RuleResult includes: rule id, expected condition, actual value, result, verification status, short explanation.

## Verdict aggregation
1. Any FAIL → NOT_ELIGIBLE (FAIL beats UNKNOWN)
2. Else any UNKNOWN → CHECK_ONE_THING
3. Else all applicable rules PASS → LIKELY_ELIGIBLE
4. No applicable rules → CHECK_ONE_THING, explanation "No applicable rules could be evaluated."
Never use the word "guaranteed".

## Normalised values
Use the enum values already in shared/fixtures/profiles.ts (e.g. "CLASS_9"). Do not change them.

## Test cases (server/test/engine.test.ts)
Define explicit rule fixtures inside the test file. Use the six profiles from shared/fixtures/profiles.ts:
1. BC-B, rural, ₹1.2L, UG year 1, age 19 + BC rule "rural income ≤ 150000" (verified) → LIKELY_ELIGIBLE
2. SC, urban, ₹2.3L, B.Tech year 2 + SC income rule marked conflicting → CHECK_ONE_THING
3. BC-D, rural, ₹1.8L, UG + BC rule "rural income ≤ 150000" (verified) → NOT_ELIGIBLE
4. ST, CLASS_9, income missing + Pre-Matric rules → CHECK_ONE_THING (income UNKNOWN)
5. Minority, age 27, graduation 64% + Overseas rules "age ≤ 30", "marks ≥ 60" → LIKELY_ELIGIBLE
6. OC, ₹1L, Intermediate year 1 + BC/SC category rules → NOT_ELIGIBLE (category FAIL)
Also: missing field → UNKNOWN; non-matching applies_when → NOT_APPLICABLE; applies_when AND array; unverified rule → UNKNOWN; each of eq, in, lte, gte, between (including inclusive bounds); FAIL + UNKNOWN together → NOT_ELIGIBLE; no applicable rules → CHECK_ONE_THING with explanation.

## Test runner
Node test runner with tsx; `npm test` runs test/*.test.ts. Update test/contract.test.ts so it no longer expects the stub to throw.

Note: (a) case 5 has no marks field in the MVP types, so the marks rule is dropped and the expected result rests on the age rule only; (b) case 3's BC rural income rule (lte 150000) is verified test data only, and a variant marked unverified expects CHECK_ONE_THING.

## Verification log
- 22 Nov 2026, 00:24 IST: verified manually; `npm test` 26/26 pass, `npm run build` passes.