import { readFileSync } from "node:fs";
import type { DocumentItem, StepItem } from "../../../shared/contracts.js";
import type {
  ProfileAttributes,
  Rule,
  RuleOperator,
  VerificationStatus,
} from "../../../shared/types.js";

export type SchemeStatus = "active" | "inactive" | "not_announced";

/** A scheme as stored and served. verification_status is derived by validateSchemes, never hand-entered. */
export interface Scheme {
  id: string;
  name: string;
  provider: "State" | "Central";
  state: string;
  portal_url: string;
  official_source_url: string;
  benefit_summary: string;
  apply_start: string | null;
  deadline: string | null;
  deadline_note: string;
  last_verified_on: string | null;
  verification_status: VerificationStatus;
  status: SchemeStatus;
  rules: Rule[];
  documents: DocumentItem[];
  steps: StepItem[];
}

/** Input shape for injected schemes. verification_status is optional and is recomputed from rules. */
export type SchemeInput = Omit<Scheme, "verification_status"> & {
  verification_status?: VerificationStatus;
};

const SEED_URL = new URL("./schemes.json", import.meta.url);

const SCHEME_STATUSES: readonly SchemeStatus[] = ["active", "inactive", "not_announced"];
const PROVIDERS: readonly Scheme["provider"][] = ["State", "Central"];
const OPERATORS: readonly RuleOperator[] = ["eq", "in", "lte", "gte", "between"];
const VERIFICATION: readonly VerificationStatus[] = ["verified", "conflicting", "unverified"];
const RULE_FIELDS: readonly (keyof ProfileAttributes)[] = [
  "category",
  "annual_income",
  "area",
  "course_level",
  "year_of_study",
  "age",
];

type Obj = Record<string, unknown>;

function isObject(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function reqString(o: Obj, key: string, ctx: string): string {
  const v = o[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${ctx}: missing or invalid field "${key}"`);
  }
  return v;
}

function nullableString(o: Obj, key: string, ctx: string): string | null {
  const v = o[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") {
    throw new Error(`${ctx}: invalid field "${key}" (expected string or null)`);
  }
  return v;
}

function requireOneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], ctx: string): T {
  const v = o[key];
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    throw new Error(`${ctx}: missing or invalid field "${key}"`);
  }
  return v as T;
}

/** Scheme status rollup from its rules: conflicting > unverified > verified. */
export function rollUpVerification(rules: Rule[]): VerificationStatus {
  if (rules.some((r) => r.verification_status === "conflicting")) return "conflicting";
  if (rules.some((r) => r.verification_status === "unverified")) return "unverified";
  return "verified";
}

function validateRule(raw: unknown, schemeId: string, index: number): Rule {
  if (!isObject(raw)) {
    throw new Error(`Scheme "${schemeId}": rule at index ${index} is not an object`);
  }
  const ruleId = reqString(raw, "id", `Scheme "${schemeId}": rule at index ${index}`);
  const ctx = `Scheme "${schemeId}", rule "${ruleId}"`;
  const scheme_id = reqString(raw, "scheme_id", ctx);
  if (scheme_id !== schemeId) {
    throw new Error(`${ctx}: scheme_id does not match its scheme`);
  }
  const field = requireOneOf(raw, "field", RULE_FIELDS, ctx);
  const operator = requireOneOf(raw, "operator", OPERATORS, ctx);
  if (!("value" in raw)) {
    throw new Error(`${ctx}: missing field "value"`);
  }
  const label = reqString(raw, "label", ctx);
  const verification_status = requireOneOf(raw, "verification_status", VERIFICATION, ctx);
  const evidence = raw.source_evidence;
  if (!Array.isArray(evidence) || !evidence.every((e) => typeof e === "string")) {
    throw new Error(`${ctx}: missing or invalid field "source_evidence" (expected string array)`);
  }
  const last_verified_on = nullableString(raw, "last_verified_on", ctx);

  const rule: Rule = {
    id: ruleId,
    scheme_id,
    field,
    operator,
    value: raw.value,
    label,
    verification_status,
    source_evidence: evidence as string[],
    last_verified_on,
  };
  if (raw.applies_when !== undefined) {
    rule.applies_when = raw.applies_when;
  }
  return rule;
}

function validateDocuments(v: unknown, ctx: string): DocumentItem[] {
  if (!Array.isArray(v)) throw new Error(`${ctx}: missing or invalid field "documents" (expected array)`);
  return v.map((d, i) => {
    if (!isObject(d)) throw new Error(`${ctx}: document at index ${i} is not an object`);
    const dctx = `${ctx}, document ${i}`;
    return { name: reqString(d, "name", dctx), tip: reqString(d, "tip", dctx) };
  });
}

function validateSteps(v: unknown, ctx: string): StepItem[] {
  if (!Array.isArray(v)) throw new Error(`${ctx}: missing or invalid field "steps" (expected array)`);
  return v.map((s, i) => {
    if (!isObject(s)) throw new Error(`${ctx}: step at index ${i} is not an object`);
    const sctx = `${ctx}, step ${i}`;
    if (typeof s.order !== "number") throw new Error(`${sctx}: missing or invalid field "order"`);
    return {
      order: s.order,
      description: reqString(s, "description", sctx),
      official_link: reqString(s, "official_link", sctx),
    };
  });
}

function validateScheme(raw: unknown, index: number): Scheme {
  if (!isObject(raw)) throw new Error(`Scheme at index ${index} is not an object`);
  const id = reqString(raw, "id", `Scheme at index ${index}`);
  const ctx = `Scheme "${id}"`;

  const rawRules = raw.rules;
  if (!Array.isArray(rawRules) || rawRules.length === 0) {
    throw new Error(`${ctx}: rules must be a non-empty array`);
  }
  const rules = rawRules.map((r, i) => validateRule(r, id, i));

  return {
    id,
    name: reqString(raw, "name", ctx),
    provider: requireOneOf(raw, "provider", PROVIDERS, ctx),
    state: reqString(raw, "state", ctx),
    portal_url: reqString(raw, "portal_url", ctx),
    official_source_url: reqString(raw, "official_source_url", ctx),
    benefit_summary: reqString(raw, "benefit_summary", ctx),
    apply_start: nullableString(raw, "apply_start", ctx),
    deadline: nullableString(raw, "deadline", ctx),
    deadline_note: reqString(raw, "deadline_note", ctx),
    last_verified_on: nullableString(raw, "last_verified_on", ctx),
    verification_status: rollUpVerification(rules),
    status: requireOneOf(raw, "status", SCHEME_STATUSES, ctx),
    rules,
    documents: validateDocuments(raw.documents, ctx),
    steps: validateSteps(raw.steps, ctx),
  };
}

/**
 * Validates an array of schemes and computes each scheme's verification_status.
 * Throws an Error naming the scheme id and the missing or invalid field.
 */
export function validateSchemes(input: unknown): Scheme[] {
  if (!Array.isArray(input)) throw new Error("Schemes must be an array");
  const schemes = input.map((s, i) => validateScheme(s, i));
  const seen = new Set<string>();
  for (const s of schemes) {
    if (seen.has(s.id)) throw new Error(`Duplicate scheme id "${s.id}"`);
    seen.add(s.id);
  }
  return schemes;
}

/** Reads and validates the seed file server/src/db/schemes.json. */
export function loadSeedSchemes(): Scheme[] {
  const text = readFileSync(SEED_URL, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (_err) {
    throw new Error("schemes.json is not valid JSON");
  }
  return validateSchemes(parsed);
}
