/**
 * Canonical shared types for Haq Scholar (type-only, no runtime code).
 * Owned by Member A. Source of truth: docs/BRIEF.md §4 and §5.
 *
 * MVP extraction covers six profile attributes only (BRIEF §5.2).
 * The other five (gender, disability, domicile_state, previous_marks_percentage,
 * is_renewal) stay in the data model and are added in a later slice.
 */

/** Social category. Subcategories (e.g. BC-B, BC-D) are not modelled in the MVP. */
export type ProfileCategory = "OC" | "BC" | "SC" | "ST" | "MINORITY" | "EBC";

/** Extracted profile attributes. Every field is optional; missing = null or undefined. */
export interface ProfileAttributes {
  category?: ProfileCategory | null;
  /** Annual family income in INR. */
  annual_income?: number | null;
  area?: "rural" | "urban" | null;
  /** Free text such as "UG", "PG", "Class 9", "Intermediate". */
  course_level?: string | null;
  year_of_study?: number | null;
  age?: number | null;
}

/**
 * Result of evaluating one rule.
 * NOT_APPLICABLE means the rule's applies_when did not match and the rule is skipped.
 * It is distinct from UNKNOWN (rule applies, but value missing or rule unverified/conflicting).
 */
export type EvalResult = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";

/** Per-rule verification state (BRIEF §5). */
export type VerificationStatus = "verified" | "conflicting" | "unverified";

/** Comparison operators supported by rules. */
export type RuleOperator = "eq" | "in" | "lte" | "gte" | "between";

/** An eligibility rule. Verification is per rule; scheme status is a rollup. */
export interface Rule {
  id: string;
  scheme_id: string;
  /** ProfileAttributes key that the rule checks, e.g. "category" or "annual_income". */
  field: keyof ProfileAttributes;
  operator: RuleOperator;
  /** Threshold or allowed value(s). null when the value is not confirmed. */
  value: unknown;
  /** Plain-language label for display. */
  label: string;
  /** Optional condition under which the rule applies. If it does not match, the rule is NOT_APPLICABLE. */
  applies_when?: unknown | null;
  verification_status: VerificationStatus;
  /** Official URLs or references supporting the rule. */
  source_evidence: string[];
  /** ISO date (YYYY-MM-DD) or null if not yet verified. */
  last_verified_on: string | null;
}

/** Outcome of one applicable rule for one profile. */
export interface RuleResult {
  rule_id: string;
  /** Operator and value, e.g. "lte 200000". */
  expected_condition: string;
  /** Profile value used, or null if missing. */
  actual_value: unknown;
  result: EvalResult;
  verification_status: VerificationStatus;
  /** Plain-language sentence for a Class 8 reader. */
  explanation: string;
}

/** Scheme-level verdict (BRIEF §4.3). */
export type Verdict = "LIKELY_ELIGIBLE" | "CHECK_ONE_THING" | "NOT_ELIGIBLE";

/** Result group shown to the student (BRIEF §2, step 5). */
export type ResultGroup = "likely_eligible" | "check_one_thing" | "not_eligible";

/** Scheme identity and official information shown on every result. */
export interface SchemeSummary {
  id: string;
  name: string;
  provider: "State" | "Central";
  state: string;
  portal_url: string;
  official_source_url: string;
  benefit_summary: string;
  /** ISO date or null. */
  deadline: string | null;
  /** ISO date or null if not verified. */
  last_verified_on: string | null;
  /** Rollup of rule statuses: any conflicting -> conflicting; else any unverified -> unverified; else verified. */
  verification_status: VerificationStatus;
}

/** Application tracking status (BRIEF §2, step 8). */
export type ApplicationStatus = "saved" | "docs_ready" | "applied" | "verified" | "sanctioned";
