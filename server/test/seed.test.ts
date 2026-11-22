import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSeedSchemes, validateSchemes } from "../src/db/load.js";

const VERIFICATION = ["verified", "conflicting", "unverified"];
const STATUSES = ["active", "inactive", "not_announced"];

const schemes = loadSeedSchemes();

describe("seed data (server/src/db/schemes.json)", () => {
  it("has exactly 3 schemes with unique ids", () => {
    assert.equal(schemes.length, 3);
    assert.equal(new Set(schemes.map((s) => s.id)).size, 3);
  });

  it("gives every scheme an official_source_url and a verification_status", () => {
    for (const s of schemes) {
      assert.ok(s.official_source_url.length > 0, `${s.id} official_source_url`);
      assert.ok(VERIFICATION.includes(s.verification_status), `${s.id} verification_status`);
    }
  });

  it("gives every rule a valid verification_status", () => {
    for (const s of schemes) {
      for (const r of s.rules) {
        assert.ok(VERIFICATION.includes(r.verification_status), `${r.id} verification_status`);
      }
    }
  });

  it("requires every verified rule to have source_evidence and last_verified_on", () => {
    for (const s of schemes) {
      for (const r of s.rules) {
        if (r.verification_status !== "verified") continue;
        assert.ok(r.source_evidence.length > 0, `${r.id} source_evidence`);
        assert.notEqual(r.last_verified_on, null, `${r.id} last_verified_on`);
      }
    }
  });

  it("gives every scheme a status of active, inactive or not_announced", () => {
    for (const s of schemes) {
      assert.ok(STATUSES.includes(s.status), `${s.id} status`);
    }
  });

  it("marks the SC income rule as conflicting", () => {
    const sc = schemes.find((s) => s.id === "ts-pms-sc");
    assert.ok(sc, "ts-pms-sc exists");
    const income = sc.rules.filter((r) => r.field === "annual_income");
    assert.equal(income.length, 1);
    assert.equal(income[0].verification_status, "conflicting");
  });

  it("gives every scheme at least one rule", () => {
    for (const s of schemes) {
      assert.ok(s.rules.length > 0, `${s.id} has rules`);
    }
  });

  it("rejects a scheme with an empty rules array", () => {
    const base = schemes[0];
    assert.throws(() => validateSchemes([{ ...base, rules: [] }]), /ts-pms-bc/);
  });

  it("does not contain the word 'guaranteed' in the raw file", () => {
    const raw = readFileSync(new URL("../src/db/schemes.json", import.meta.url), "utf8");
    assert.equal(/guaranteed/i.test(raw), false);
  });
});
