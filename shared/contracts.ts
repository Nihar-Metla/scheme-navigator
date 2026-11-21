/**
 * API request and response shapes for Haq Scholar (types only, no runtime code).
 * Owned by Member A. Imports canonical types from ./types.
 *
 * Privacy: no response includes the raw student text (BRIEF §3, guardrail 3).
 */
import type {
  ApplicationStatus,
  ProfileAttributes,
  Rule,
  RuleResult,
  SchemeSummary,
  Verdict,
  VerificationStatus,
} from "./types";

/** Error body returned by every endpoint on failure. */
export type ApiError = { error: string };

/** A scheme with its verdict and per-rule explanations for one profile. */
export type EvaluatedScheme = SchemeSummary & {
  verdict: Verdict;
  /** Applicable rules only. NOT_APPLICABLE rules are skipped and not listed (BRIEF §2 note). */
  rule_results: RuleResult[];
};

/**
 * POST /api/extract
 * Request: { text } (raw student description, Telugu/Hindi/English).
 * Response: extracted attributes, whether sanitisation changed the input, and fields still missing.
 * The raw text is never echoed back.
 */
export interface ExtractRequest {
  text: string;
}

export interface ExtractResponse {
  attributes: ProfileAttributes;
  /** True when Aadhaar-like numbers were stripped before extraction. */
  sanitised: boolean;
  /** Names of ProfileAttributes keys that were not extracted. */
  missing_fields: string[];
}

/**
 * POST /api/evaluate
 * Request: { attributes } (student-corrected chips).
 * Response: schemes grouped by verdict, and at most 3 follow-up questions for missing fields that change a verdict.
 */
export interface EvaluateRequest {
  attributes: ProfileAttributes;
}

export interface EvaluateResponse {
  groups: {
    likely_eligible: EvaluatedScheme[];
    check_one_thing: EvaluatedScheme[];
    not_eligible: EvaluatedScheme[];
  };
  /** Maximum 3 entries. */
  follow_up_questions: string[];
}

/** One document in the personalised checklist. */
export interface DocumentItem {
  name: string;
  tip: string;
}

/** One step in the apply guide. */
export interface StepItem {
  order: number;
  description: string;
  official_link: string;
}

/**
 * GET /api/schemes/:id
 * Response: scheme detail with its rules, checklist and apply guide.
 */
export interface SchemeDetailResponse extends SchemeSummary {
  rules: Rule[];
  documents: DocumentItem[];
  steps: StepItem[];
}

/** An application the student is tracking. No personal identifiers are returned. */
export interface Application {
  id: string;
  scheme_id: string;
  status: ApplicationStatus;
  /** Short plain-language next action, or null. */
  next_action: string | null;
  /** ISO date or null. */
  due_date: string | null;
  /** ISO timestamp. */
  updated_at: string;
}

/**
 * GET /api/applications
 * Response: the current session's applications.
 */
export interface ListApplicationsResponse {
  applications: Application[];
}

/**
 * POST /api/applications
 * Request: scheme to start tracking. Status starts at "saved".
 * Response: the created application.
 */
export interface CreateApplicationRequest {
  scheme_id: string;
}
export type CreateApplicationResponse = Application;

/**
 * PATCH /api/applications/:id
 * Request: any subset of status, next_action and due_date.
 * Response: the updated application.
 */
export interface UpdateApplicationRequest {
  status?: ApplicationStatus;
  next_action?: string | null;
  due_date?: string | null;
}
export type UpdateApplicationResponse = Application;

/**
 * GET /api/admin/rules
 * Header: x-admin-passcode (required).
 * Response: all rules across schemes.
 */
export interface ListRulesResponse {
  rules: Rule[];
}

/**
 * PATCH /api/admin/rules/:id
 * Header: x-admin-passcode (required).
 * Request: editable rule fields only. Every change is written to rule_edits.
 * Response: the updated rule.
 */
export interface UpdateRuleRequest {
  value?: unknown;
  verification_status?: VerificationStatus;
  source_evidence?: string[];
  last_verified_on?: string | null;
}
export type UpdateRuleResponse = Rule;


