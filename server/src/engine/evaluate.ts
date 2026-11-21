import type {
  EngineInput,
  EngineOutput,
  EvaluateFn,
  ProfileAttributes,
  Rule,
  RuleResult,
  Verdict,
} from "./types.js";

/** One applies_when condition: { field, operator, value }. */
interface Condition {
  field: keyof ProfileAttributes;
  operator: Rule["operator"];
  value: unknown;
}

function isCondition(x: unknown): x is Condition {
  if (typeof x !== "object" || x === null) return false;
  const c = x as Record<string, unknown>;
  return typeof c.field === "string" && typeof c.operator === "string" && "value" in c;
}

/**
 * Compares a profile value with a rule value using one operator.
 * Returns null when the operator, value or profile value is not usable.
 */
function compare(operator: string, actual: unknown, expected: unknown): boolean | null {
  switch (operator) {
    case "eq":
      return actual === expected;
    case "in":
      return Array.isArray(expected) ? expected.includes(actual) : null;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" ? actual <= expected : null;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" ? actual >= expected : null;
    case "between":
      if (
        typeof actual === "number" &&
        Array.isArray(expected) &&
        expected.length === 2 &&
        typeof expected[0] === "number" &&
        typeof expected[1] === "number"
      ) {
        return actual >= expected[0] && actual <= expected[1];
      }
      return null;
    default:
      return null;
  }
}

/**
 * Checks applies_when. Absent means always applies. A single condition or an
 * AND array. Returns true (applies), false (does not apply), or null (cannot tell).
 */
function appliesWhen(profile: ProfileAttributes, applies: unknown): boolean | null {
  if (applies === undefined || applies === null) return true;
  const conditions: unknown[] = Array.isArray(applies) ? applies : [applies];
  let unknown = false;
  for (const raw of conditions) {
    if (!isCondition(raw)) return null;
    const actual = profile[raw.field];
    if (actual === undefined || actual === null) {
      unknown = true;
      continue;
    }
    const outcome = compare(raw.operator, actual, raw.value);
    if (outcome === false) return false;
    if (outcome === null) unknown = true;
  }
  return unknown ? null : true;
}

function evaluateRule(profile: ProfileAttributes, rule: Rule): RuleResult {
  const expected = `${rule.operator} ${JSON.stringify(rule.value) ?? "null"}`;
  const actual = profile[rule.field] ?? null;
  const base = {
    rule_id: rule.id,
    expected_condition: expected,
    actual_value: actual,
    verification_status: rule.verification_status,
  };

  // 1. applies_when does not match -> NOT_APPLICABLE
  const applies = appliesWhen(profile, rule.applies_when);
  if (applies === false) {
    return { ...base, result: "NOT_APPLICABLE", explanation: `${rule.label} does not apply to this profile.` };
  }
  if (applies === null) {
    return {
      ...base,
      result: "UNKNOWN",
      explanation: `Cannot tell whether ${rule.label} applies, because some information is missing.`,
    };
  }

  // 2. conflicting or unverified -> UNKNOWN
  if (rule.verification_status !== "verified") {
    return {
      ...base,
      result: "UNKNOWN",
      explanation: `${rule.label} is ${rule.verification_status}, so it cannot be checked yet.`,
    };
  }

  // 3. profile value missing, or rule value null -> UNKNOWN
  if (rule.value === null || rule.value === undefined) {
    return { ...base, result: "UNKNOWN", explanation: `The limit for ${rule.label} is not confirmed.` };
  }
  if (actual === null) {
    return { ...base, result: "UNKNOWN", explanation: `We do not have the information needed to check ${rule.label}.` };
  }

  // 4. evaluate the operator -> PASS or FAIL
  const outcome = compare(rule.operator, actual, rule.value);
  if (outcome === null) {
    return {
      ...base,
      result: "UNKNOWN",
      explanation: `The value for ${rule.label} is in a format the check cannot read.`,
    };
  }
  return outcome
    ? { ...base, result: "PASS", explanation: `${rule.label} is met.` }
    : { ...base, result: "FAIL", explanation: `${rule.label} is not met.` };
}

export const evaluate: EvaluateFn = (input: EngineInput): EngineOutput => {
  const rule_results = input.rules.map((rule) => evaluateRule(input.attributes, rule));
  const applicable = rule_results.filter((r) => r.result !== "NOT_APPLICABLE");

  let verdict: Verdict;
  let explanation: string;
  if (applicable.length === 0) {
    verdict = "CHECK_ONE_THING";
    explanation = "No applicable rules could be evaluated.";
  } else if (applicable.some((r) => r.result === "FAIL")) {
    verdict = "NOT_ELIGIBLE";
    explanation = "At least one condition is not met.";
  } else if (applicable.some((r) => r.result === "UNKNOWN")) {
    verdict = "CHECK_ONE_THING";
    explanation = "Some conditions need more information or verification.";
  } else {
    verdict = "LIKELY_ELIGIBLE";
    explanation = "All applicable conditions are met on the information given.";
  }

  return { verdict, rule_results, explanation };
};
