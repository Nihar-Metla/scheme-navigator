/**
 * Base mock fixtures for frontend development (BRIEF §13).
 * Owned by Member A. Type-only imports; no runtime dependencies.
 *
 * Scheme names, rule labels and outcomes here are mock data for UI work.
 * They are not verified eligibility determinations. No threshold is confirmed here.
 */
import type { EvaluateResponse, EvaluatedScheme } from "../contracts";
import type { RuleResult, SchemeSummary } from "../types";

const TELANGANA_EPASS = "https://telanganaepass.cgg.gov.in/";
const NSP = "https://scholarships.gov.in/";

/** The five seeded schemes (BRIEF §7). All unverified until Member B supplies evidence. */
export const schemeSummaries: SchemeSummary[] = [
  {
    id: "ts-post-matric-bc",
    name: "Telangana Post-Matric Scholarship — BC",
    provider: "State",
    state: "Telangana",
    portal_url: TELANGANA_EPASS,
    official_source_url: TELANGANA_EPASS,
    benefit_summary: "Scholarship for post-matric students. Details to be confirmed from the official source.",
    deadline: null,
    last_verified_on: null,
    verification_status: "unverified",
  },
  {
    id: "ts-post-matric-sc",
    name: "Telangana Post-Matric Scholarship — SC",
    provider: "State",
    state: "Telangana",
    portal_url: TELANGANA_EPASS,
    official_source_url: TELANGANA_EPASS,
    benefit_summary: "Scholarship for post-matric students. Details to be confirmed from the official source.",
    deadline: null,
    last_verified_on: null,
    verification_status: "unverified",
  },
  {
    id: "ts-pre-matric-st",
    name: "Telangana Pre-Matric Scholarship — ST",
    provider: "State",
    state: "Telangana",
    portal_url: TELANGANA_EPASS,
    official_source_url: TELANGANA_EPASS,
    benefit_summary: "Scholarship for pre-matric students. Details to be confirmed from the official source.",
    deadline: null,
    last_verified_on: null,
    verification_status: "unverified",
  },
  {
    id: "ts-cm-overseas",
    name: "Telangana CM Overseas Scholarship",
    provider: "State",
    state: "Telangana",
    portal_url: TELANGANA_EPASS,
    official_source_url: TELANGANA_EPASS,
    benefit_summary: "Scholarship for study abroad. Details to be confirmed from the official source.",
    deadline: null,
    last_verified_on: null,
    verification_status: "unverified",
  },
  {
    id: "nsp-central",
    name: "NSP central scheme (name to be confirmed by Member B)",
    provider: "Central",
    state: "All India",
    portal_url: NSP,
    official_source_url: NSP,
    benefit_summary: "Central scheme listed on the National Scholarship Portal. Details to be confirmed from the official source.",
    deadline: null,
    last_verified_on: null,
    verification_status: "unverified",
  },
];

const [bcScheme, scScheme, stScheme] = schemeSummaries;

/**
 * Rule result for the SC Post-Matric income rule. Sources disagree (₹2 lakh vs ₹2.5 lakh).
 * Neither threshold is chosen. The rule is UNKNOWN and is not evaluated as a confirmed condition.
 */
export const scConflictFixture: RuleResult = {
  rule_id: "ts-post-matric-sc-income",
  expected_condition: "annual family income within the SC limit (threshold not yet resolved)",
  actual_value: null,
  result: "UNKNOWN",
  verification_status: "conflicting",
  explanation:
    "The income limit for this scheme is not confirmed. Official sources disagree, so this condition is not checked as a confirmed rule. Source evidence: source A: ₹2 lakh; source B: ₹2.5 lakh.",
};

/** A rule whose applies_when does not match. It is skipped, not UNKNOWN. */
export const notApplicableRuleResult: RuleResult = {
  rule_id: "ts-post-matric-bc-rural-only",
  expected_condition: "area eq rural",
  actual_value: "urban",
  result: "NOT_APPLICABLE",
  verification_status: "verified",
  explanation: "This rule applies only to rural students, so it does not apply to this profile and is skipped.",
};

/** Scheme in likely_eligible: every applicable rule PASSes. */
const likelyScheme: EvaluatedScheme = {
  ...bcScheme,
  verdict: "LIKELY_ELIGIBLE",
  rule_results: [
    {
      rule_id: "ts-post-matric-bc-category",
      expected_condition: "category eq BC",
      actual_value: "BC",
      result: "PASS",
      verification_status: "verified",
      explanation:
        "Your category is BC, which this scheme requires. Source: https://telanganaepass.cgg.gov.in/",
    },
    {
      rule_id: "ts-post-matric-bc-course-level",
      expected_condition: "course_level in UG, PG",
      actual_value: "UG",
      result: "PASS",
      verification_status: "verified",
      explanation:
        "Your course level is UG, which this scheme covers. Source: https://telanganaepass.cgg.gov.in/",
    },
  ],
};

/** Scheme in check_one_thing: one UNKNOWN rule, no FAIL. */
const checkScheme: EvaluatedScheme = {
  ...scScheme,
  verdict: "CHECK_ONE_THING",
  rule_results: [scConflictFixture],
};

/** Scheme in not_eligible: one FAIL on a category rule. */
const notEligibleScheme: EvaluatedScheme = {
  ...stScheme,
  verdict: "NOT_ELIGIBLE",
  rule_results: [
    {
      rule_id: "ts-pre-matric-st-category",
      expected_condition: "category eq ST",
      actual_value: "BC",
      result: "FAIL",
      verification_status: "verified",
      explanation:
        "This scheme is for ST students. Your category is BC, so this scheme does not match. Source: https://telanganaepass.cgg.gov.in/",
    },
  ],
};

/** Mock response with one scheme in likely_eligible. */
export const evaluateResponseLikely: EvaluateResponse = {
  groups: {
    likely_eligible: [likelyScheme],
    check_one_thing: [],
    not_eligible: [],
  },
  follow_up_questions: [],
};

/** Mock response with one scheme in check_one_thing. */
export const evaluateResponseCheck: EvaluateResponse = {
  groups: {
    likely_eligible: [],
    check_one_thing: [checkScheme],
    not_eligible: [],
  },
  follow_up_questions: [],
};

/** Mock response with one scheme in not_eligible. */
export const evaluateResponseNotEligible: EvaluateResponse = {
  groups: {
    likely_eligible: [],
    check_one_thing: [],
    not_eligible: [notEligibleScheme],
  },
  follow_up_questions: [],
};

