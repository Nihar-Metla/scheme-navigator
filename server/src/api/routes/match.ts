import express from "express";
import type { EvaluateResponse, EvaluatedScheme } from "../../../../shared/contracts.js";
import type {
  ProfileAttributes,
  ProfileCategory,
  ResultGroup,
  Verdict,
} from "../../../../shared/types.js";
import type { Scheme } from "../../db/load.js";
import { evaluate } from "../../engine/evaluate.js";
import { toSummary } from "./schemes.js";

const CATEGORIES: readonly string[] = ["OC", "BC", "SC", "ST", "MINORITY", "EBC"];
const AREAS: readonly string[] = ["rural", "urban"];
const NUMERIC_FIELDS = ["annual_income", "age", "year_of_study"] as const;
const GROUP_FOR_VERDICT: Record<Verdict, ResultGroup> = {
  LIKELY_ELIGIBLE: "likely_eligible",
  CHECK_ONE_THING: "check_one_thing",
  NOT_ELIGIBLE: "not_eligible",
};
const MAX_FOLLOW_UPS = 3;

type ParseResult = { attributes: ProfileAttributes } | { error: string };

/**
 * Keeps only the known attribute keys and checks their types.
 * Error messages name the field only, never the submitted value.
 */
function parseAttributes(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "attributes must be an object" };
  }
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of NUMERIC_FIELDS) {
    const v = src[key];
    if (v === undefined) continue;
    if (v !== null && typeof v !== "number") return { error: `${key} must be a number` };
    out[key] = v;
  }

  const area = src.area;
  if (area !== undefined) {
    if (area !== null && (typeof area !== "string" || !AREAS.includes(area))) {
      return { error: "area must be rural, urban or null" };
    }
    out.area = area;
  }

  const category = src.category;
  if (category !== undefined) {
    if (category !== null && (typeof category !== "string" || !CATEGORIES.includes(category))) {
      return { error: "category must be one of OC, BC, SC, ST, MINORITY, EBC or null" };
    }
    out.category = category as ProfileCategory | null;
  }

  const courseLevel = src.course_level;
  if (courseLevel !== undefined) {
    if (courseLevel !== null && typeof courseLevel !== "string") {
      return { error: "course_level must be a string" };
    }
    out.course_level = courseLevel;
  }

  return { attributes: out as ProfileAttributes };
}

function isNullish(v: unknown): v is null | undefined {
  return v === undefined || v === null;
}

export function createEvaluateRouter(schemes: Scheme[]): express.Router {
  const router = express.Router();

  router.post("/api/evaluate", (req, res) => {
    const body: unknown = req.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      res.status(400).json({ error: "attributes must be an object" });
      return;
    }

    const parsed = parseAttributes((body as Record<string, unknown>).attributes);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const attributes = parsed.attributes;

    const groups: EvaluateResponse["groups"] = {
      likely_eligible: [],
      check_one_thing: [],
      not_eligible: [],
    };
    const followUps = new Set<string>();

    for (const scheme of schemes) {
      const result = evaluate({ attributes, rules: scheme.rules });

      // rule_results[i] is produced from scheme.rules[i] by the engine.
      scheme.rules.forEach((rule, i) => {
        const ruleResult = result.rule_results[i];
        if (
          ruleResult.result === "UNKNOWN" &&
          rule.verification_status === "verified" &&
          isNullish(attributes[rule.field])
        ) {
          followUps.add(rule.field);
        }
      });

      const evaluated: EvaluatedScheme = {
        ...toSummary(scheme),
        verdict: result.verdict,
        rule_results: result.rule_results.filter((r) => r.result !== "NOT_APPLICABLE"),
      };
      groups[GROUP_FOR_VERDICT[result.verdict]].push(evaluated);
    }

    const byName = (a: EvaluatedScheme, b: EvaluatedScheme) => a.name.localeCompare(b.name);
    groups.likely_eligible.sort(byName);
    groups.check_one_thing.sort(byName);
    groups.not_eligible.sort(byName);

    const response: EvaluateResponse = {
      groups,
      follow_up_questions: [...followUps].slice(0, MAX_FOLLOW_UPS),
    };
    res.json(response);
  });

  return router;
}
