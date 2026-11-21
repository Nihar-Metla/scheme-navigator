import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/engine/evaluate.js";
import type { ProfileAttributes, Rule, VerificationStatus } from "../../shared/types.js";
import { profile1, profile2, profile3, profile4, profile5, profile6 } from "../../shared/fixtures/profiles.js";

/**
 * Rule fixtures are test data only. They are not claims about real schemes.
 */
function rule(
  id: string,
  field: Rule["field"],
  operator: Rule["operator"],
  value: unknown,
  extra: Partial<Rule> = {},
): Rule {
  return {
    id,
    scheme_id: "test-scheme",
    field,
    operator,
    value,
    label: id,
    applies_when: undefined,
    verification_status: "verified" as VerificationStatus,
    source_evidence: [],
    last_verified_on: null,
    ...extra,
  };
}

/** BC rural income rule (test data): annual_income lte 150000, applies to BC rural. */
function bcRuralIncomeRule(status: VerificationStatus = "verified"): Rule {
  return rule("bc-rural-income", "annual_income", "lte", 150000, {
    label: "BC rural income limit",
    verification_status: status,
    applies_when: [
      { field: "category", operator: "eq", value: "BC" },
      { field: "area", operator: "eq", value: "rural" },
    ],
  });
}

// ---- The six fictional profiles (shared/fixtures/profiles.ts) ----

test("profile 1 (BC-B, rural, 1.2L, UG year 1, age 19) is LIKELY_ELIGIBLE under the verified BC rural rule", () => {
  const out = evaluate({ attributes: profile1, rules: [bcRuralIncomeRule()] });
  assert.equal(out.verdict, "LIKELY_ELIGIBLE");
  assert.equal(out.rule_results[0].result, "PASS");
});

test("profile 2 (SC, urban, 2.3L, B.Tech year 2) is CHECK_ONE_THING when the SC income rule is conflicting", () => {
  const out = evaluate({
    attributes: profile2,
    rules: [
      rule("sc-income", "annual_income", "lte", 250000, {
        verification_status: "conflicting",
        applies_when: { field: "category", operator: "eq", value: "SC" },
      }),
    ],
  });
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.equal(out.rule_results[0].result, "UNKNOWN");
});

test("profile 3 (BC-D, rural, 1.8L) is NOT_ELIGIBLE under the verified BC rural rule", () => {
  const out = evaluate({ attributes: profile3, rules: [bcRuralIncomeRule()] });
  assert.equal(out.verdict, "NOT_ELIGIBLE");
  assert.equal(out.rule_results[0].result, "FAIL");
});

test("profile 3 with the same BC rural rule marked unverified is CHECK_ONE_THING", () => {
  const out = evaluate({ attributes: profile3, rules: [bcRuralIncomeRule("unverified")] });
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.equal(out.rule_results[0].result, "UNKNOWN");
});

test("profile 4 (ST, CLASS_9, income missing) is CHECK_ONE_THING with income UNKNOWN", () => {
  const out = evaluate({
    attributes: profile4,
    rules: [
      rule("pre-matric-category", "category", "in", ["SC", "ST"], {
        applies_when: { field: "course_level", operator: "eq", value: "CLASS_9" },
      }),
      rule("pre-matric-income", "annual_income", "lte", 250000, {
        applies_when: { field: "course_level", operator: "eq", value: "CLASS_9" },
      }),
    ],
  });
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.equal(out.rule_results[0].result, "PASS");
  assert.equal(out.rule_results[1].result, "UNKNOWN");
});

test("profile 5 (Minority, age 27, PG) is LIKELY_ELIGIBLE under the overseas age rule", () => {
  const out = evaluate({
    attributes: profile5,
    rules: [rule("overseas-age", "age", "lte", 30, { label: "Overseas age limit" })],
  });
  assert.equal(out.verdict, "LIKELY_ELIGIBLE");
  assert.equal(out.rule_results[0].result, "PASS");
});

test("profile 6 (OC, 1L, Intermediate year 1) is NOT_ELIGIBLE under BC/SC category rules", () => {
  const out = evaluate({
    attributes: profile6,
    rules: [rule("bc-sc-category", "category", "in", ["BC", "SC"])],
  });
  assert.equal(out.verdict, "NOT_ELIGIBLE");
  assert.equal(out.rule_results[0].result, "FAIL");
});

// ---- Missing fields, NOT_APPLICABLE, verification ----

test("missing profile field gives UNKNOWN and CHECK_ONE_THING", () => {
  const out = evaluate({
    attributes: { category: "BC" },
    rules: [rule("income", "annual_income", "lte", 150000)],
  });
  assert.equal(out.rule_results[0].result, "UNKNOWN");
  assert.equal(out.rule_results[0].actual_value, null);
  assert.equal(out.verdict, "CHECK_ONE_THING");
});

test("applies_when that does not match gives NOT_APPLICABLE and is skipped in the verdict", () => {
  const out = evaluate({
    attributes: { category: "BC", annual_income: 999999 },
    rules: [
      rule("sc-only", "annual_income", "lte", 250000, {
        applies_when: { field: "category", operator: "eq", value: "SC" },
      }),
    ],
  });
  assert.equal(out.rule_results[0].result, "NOT_APPLICABLE");
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.equal(out.explanation, "No applicable rules could be evaluated.");
});

test("applies_when AND array: all conditions must match", () => {
  const r = rule("minority-urban-age", "age", "lte", 30, {
    applies_when: [
      { field: "category", operator: "eq", value: "MINORITY" },
      { field: "area", operator: "eq", value: "urban" },
    ],
  });
  const partial = evaluate({ attributes: { category: "MINORITY", area: "rural", age: 27 }, rules: [r] });
  assert.equal(partial.rule_results[0].result, "NOT_APPLICABLE");

  const full = evaluate({ attributes: { category: "MINORITY", area: "urban", age: 27 }, rules: [r] });
  assert.equal(full.rule_results[0].result, "PASS");
  assert.equal(full.verdict, "LIKELY_ELIGIBLE");
});

test("conflicting rule gives UNKNOWN even when the profile value would pass", () => {
  const out = evaluate({
    attributes: { annual_income: 100000 },
    rules: [rule("income", "annual_income", "lte", 150000, { verification_status: "conflicting" })],
  });
  assert.equal(out.rule_results[0].result, "UNKNOWN");
  assert.equal(out.verdict, "CHECK_ONE_THING");
});

test("unverified rule gives UNKNOWN even when the profile value would pass", () => {
  const out = evaluate({
    attributes: { annual_income: 100000 },
    rules: [rule("income", "annual_income", "lte", 150000, { verification_status: "unverified" })],
  });
  assert.equal(out.rule_results[0].result, "UNKNOWN");
  assert.equal(out.verdict, "CHECK_ONE_THING");
});

test("rule value null gives UNKNOWN", () => {
  const out = evaluate({
    attributes: { annual_income: 100000 },
    rules: [rule("income", "annual_income", "lte", null)],
  });
  assert.equal(out.rule_results[0].result, "UNKNOWN");
});

test("rule_results carry rule id, expected condition, actual value and verification status", () => {
  const out = evaluate({
    attributes: { annual_income: 120000 },
    rules: [rule("income", "annual_income", "lte", 150000)],
  });
  const [res] = out.rule_results;
  assert.equal(res.rule_id, "income");
  assert.equal(res.expected_condition, "lte 150000");
  assert.equal(res.actual_value, 120000);
  assert.equal(res.verification_status, "verified");
  assert.equal(typeof res.explanation, "string");
});

// ---- Operators, including inclusive bounds ----

test("eq matches exactly and fails otherwise", () => {
  const r = rule("cat", "category", "eq", "BC");
  assert.equal(evaluate({ attributes: { category: "BC" }, rules: [r] }).rule_results[0].result, "PASS");
  assert.equal(evaluate({ attributes: { category: "OC" }, rules: [r] }).rule_results[0].result, "FAIL");
});

test("in matches any listed value and fails otherwise", () => {
  const r = rule("cat", "category", "in", ["SC", "ST"]);
  assert.equal(evaluate({ attributes: { category: "ST" }, rules: [r] }).rule_results[0].result, "PASS");
  assert.equal(evaluate({ attributes: { category: "BC" }, rules: [r] }).rule_results[0].result, "FAIL");
});

test("lte is inclusive at the bound", () => {
  const r = rule("income", "annual_income", "lte", 150000);
  assert.equal(evaluate({ attributes: { annual_income: 150000 }, rules: [r] }).rule_results[0].result, "PASS");
  assert.equal(evaluate({ attributes: { annual_income: 150001 }, rules: [r] }).rule_results[0].result, "FAIL");
});

test("gte is inclusive at the bound", () => {
  const r = rule("age", "age", "gte", 18);
  assert.equal(evaluate({ attributes: { age: 18 }, rules: [r] }).rule_results[0].result, "PASS");
  assert.equal(evaluate({ attributes: { age: 17 }, rules: [r] }).rule_results[0].result, "FAIL");
});

test("between is inclusive at both bounds", () => {
  const r = rule("age", "age", "between", [18, 25]);
  const res = (age: number) => evaluate({ attributes: { age }, rules: [r] }).rule_results[0].result;
  assert.equal(res(18), "PASS");
  assert.equal(res(25), "PASS");
  assert.equal(res(17), "FAIL");
  assert.equal(res(26), "FAIL");
});

// ---- Verdict aggregation ----

test("FAIL plus UNKNOWN gives NOT_ELIGIBLE", () => {
  const attributes: ProfileAttributes = { category: "OC" };
  const out = evaluate({
    attributes,
    rules: [
      rule("bc-sc", "category", "in", ["BC", "SC"]),
      rule("income", "annual_income", "lte", 150000),
    ],
  });
  assert.equal(out.rule_results[0].result, "FAIL");
  assert.equal(out.rule_results[1].result, "UNKNOWN");
  assert.equal(out.verdict, "NOT_ELIGIBLE");
});

test("all applicable rules PASS gives LIKELY_ELIGIBLE", () => {
  const out = evaluate({
    attributes: { category: "BC", age: 19 },
    rules: [rule("bc", "category", "eq", "BC"), rule("age", "age", "gte", 18)],
  });
  assert.equal(out.verdict, "LIKELY_ELIGIBLE");
});

test("no rules gives CHECK_ONE_THING with the no-applicable-rules explanation", () => {
  const out = evaluate({ attributes: profile1, rules: [] });
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.deepEqual(out.rule_results, []);
  assert.equal(out.explanation, "No applicable rules could be evaluated.");
});

test("all rules NOT_APPLICABLE gives CHECK_ONE_THING with the no-applicable-rules explanation", () => {
  const out = evaluate({
    attributes: profile1,
    rules: [
      rule("sc", "category", "eq", "SC", {
        applies_when: { field: "category", operator: "eq", value: "SC" },
      }),
    ],
  });
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.equal(out.explanation, "No applicable rules could be evaluated.");
});
