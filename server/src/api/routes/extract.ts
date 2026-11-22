import express from "express";
import type { ProfileAttributes } from "../../../../shared/types.js";
import { sanitiseWithFlag } from "../../ai/extract.js";
import { KeywordExtractor } from "../../ai/keywordExtractor.js";

const MISSING_CHECK_KEYS = ["category", "annual_income", "area", "course_level", "year_of_study", "age"] as const;

const extractor = new KeywordExtractor();

/** POST /api/extract. Deliberately does not echo, log or store the submitted text. */
export function createExtractRouter(): express.Router {
  const router = express.Router();

  router.post("/api/extract", async (req, res) => {
    const text: unknown = req.body?.text;
    if (typeof text !== "string" || text.trim() === "") {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { text: clean, sanitised } = sanitiseWithFlag(text);

    let attributes: ProfileAttributes;
    try {
      attributes = await extractor.extract(clean);
    } catch {
      res.status(500).json({ error: "Extraction failed" });
      return;
    }

    const missing_fields = MISSING_CHECK_KEYS.filter((key) => attributes[key] === null || attributes[key] === undefined);

    res.status(200).json({ attributes, sanitised, missing_fields });
  });

  return router;
}
