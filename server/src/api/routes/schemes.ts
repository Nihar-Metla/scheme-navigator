import express from "express";
import type { SchemeDetailResponse } from "../../../../shared/contracts.js";
import type { SchemeSummary } from "../../../../shared/types.js";
import type { Scheme } from "../../db/load.js";

/** Only the SchemeSummary fields. status, deadline_note and apply_start are never returned. */
export function toSummary(s: Scheme): SchemeSummary {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    state: s.state,
    portal_url: s.portal_url,
    official_source_url: s.official_source_url,
    benefit_summary: s.benefit_summary,
    deadline: s.deadline,
    last_verified_on: s.last_verified_on,
    verification_status: s.verification_status,
  };
}

export function createSchemesRouter(schemes: Scheme[]): express.Router {
  const router = express.Router();

  router.get("/api/schemes", (_req, res) => {
    res.json(schemes.map(toSummary));
  });

  router.get("/api/schemes/:id", (req, res) => {
    const scheme = schemes.find((s) => s.id === req.params.id);
    if (!scheme) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    const detail: SchemeDetailResponse = {
      ...toSummary(scheme),
      rules: scheme.rules,
      documents: scheme.documents,
      steps: scheme.steps,
    };
    res.json(detail);
  });

  return router;
}
