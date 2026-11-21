import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/api/app.js";
import { sanitise } from "../src/ai/extract.js";
import { evaluate } from "../src/engine/evaluate.js";

test("createApp is a function", () => {
  assert.equal(typeof createApp, "function");
});

test("sanitise redacts an Aadhaar-like number", () => {
  const out = sanitise("aadhaar 1234 5678 9012 here");
  assert.ok(out.includes("[REDACTED]"));
  assert.ok(!out.includes("9012"));
});

test("evaluate returns CHECK_ONE_THING with no rule results when there are no rules", () => {
  const out = evaluate({ attributes: {}, rules: [] });
  assert.equal(out.verdict, "CHECK_ONE_THING");
  assert.deepEqual(out.rule_results, []);
  assert.equal(out.explanation, "No applicable rules could be evaluated.");
});
