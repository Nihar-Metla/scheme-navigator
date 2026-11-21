import type { ProfileAttributes, Rule, RuleResult, Verdict } from "../../../shared/types.js";

export type { ProfileAttributes, Rule, RuleResult, Verdict };

export interface EngineInput {
  attributes: ProfileAttributes;
  rules: Rule[];
}

export interface EngineOutput {
  verdict: Verdict;
  rule_results: RuleResult[];
  /** Plain-language summary of the verdict. */
  explanation?: string;
}

export type EvaluateFn = (input: EngineInput) => EngineOutput;
