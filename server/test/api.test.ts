import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/api/app.js";
import type { SchemeInput } from "../src/db/load.js";
import { evaluate } from "../src/engine/evaluate.js";
import type { Rule } from "../../shared/types.js";
import { profile1, profile2, profile3, profile6 } from "../../shared/fixtures/profiles.js";

type Over = Partial<Rule> & Pick<Rule, "field" | "operator" | "value" | "label">;

function verifiedRule(schemeId: string, n: number, over: Over): Rule {
  return {
    id: `${schemeId}-${n}`,
    scheme_id: schemeId,
    verification_status: "verified",
    source_evidence: ["https://example.test/source: test wording"],
    last_verified_on: "2026-11-01",
    ...over,
  };
}

function unverifiedRule(schemeId: string, n: number, over: Over): Rule {
  return {
    id: `${schemeId}-${n}`,
    scheme_id: schemeId,
    verification_status: "unverified",
    source_evidence: [],
    last_verified_on: null,
    ...over,
  };
}

function conflictingRule(schemeId: string, n: number, over: Over): Rule {
  return {
    id: `${schemeId}-${n}`,
    scheme_id: schemeId,
    verification_status: "conflicting",
    source_evidence: ["Conflict: two different values in official wording."],
    last_verified_on: null,
    ...over,
  };
}

function scheme(id: string, name: string, rules: Rule[]): SchemeInput {
  return {
    id,
    name,
    provider: "State",
    state: "Telangana",
    portal_url: "https://example.test/portal",
    official_source_url: "https://example.test/source",
    benefit_summary: "Test scheme.",
    apply_start: null,
    deadline: null,
    deadline_note: "Test note.",
    last_verified_on: null,
    status: "active",
    rules,
    documents: [{ name: "Passport photo", tip: "Test tip." }],
    steps: [{ order: 1, description: "Test step.", official_link: "https://example.test/source" }],
  };
}

// Injected schemes used by the main API tests.
const alphaRules = (id: string): Rule[] => [
  verifiedRule(id, 1, { field: "category", operator: "in", value: ["BC", "EBC"], label: "Category is BC or EBC" }),
  verifiedRule(id, 2, { field: "annual_income", operator: "lte", value: 150000, label: "Income limit" }),
];
const testSchemes: SchemeInput[] = [
  scheme("ts-alpha", "Alpha Scholarship", alphaRules("ts-alpha")),
  scheme("ts-delta", "Delta Scholarship", [
    verifiedRule("ts-delta", 1, { field: "category", operator: "eq", value: "OC", label: "Category is OC" }),
    verifiedRule("ts-delta", 2, { field: "annual_income", operator: "lte", value: 150000, label: "Income limit" }),
  ]),
  scheme("ts-beta", "Beta Scholarship", [
    unverifiedRule("ts-beta", 1, { field: "category", operator: "eq", value: "SC", label: "Category is SC" }),
  ]),
  scheme("ts-gamma", "Gamma Scholarship", [
    verifiedRule("ts-gamma", 1, { field: "category", operator: "eq", value: "SC", label: "Category is SC" }),
    verifiedRule("ts-gamma", 2, { field: "course_level", operator: "in", value: ["UG", "PG"], label: "Course level" }),
  ]),
];

async function withServer<T>(schemes: SchemeInput[], fn: (base: string) => Promise<T>): Promise<T> {
  const server = createApp({ schemes }).listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

async function postRaw(base: string, raw: string): Promise<{ status: number; text: string }> {
  const res = await fetch(`${base}/api/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw,
  });
  return { status: res.status, text: await res.text() };
}

function post(base: string, body: unknown) {
  return postRaw(base, JSON.stringify(body));
}

describe("GET /api/health", () => {
  it("returns ok", async () => {
    await withServer(testSchemes, async (base) => {
      const res = await fetch(`${base}/api/health`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    });
  });
});

describe("GET /api/schemes", () => {
  it("returns every injected scheme as a summary only", async () => {
    await withServer(testSchemes, async (base) => {
      const res = await fetch(`${base}/api/schemes`);
      assert.equal(res.status, 200);
      const list = (await res.json()) as Record<string, unknown>[];
      assert.deepEqual(
        list.map((s) => s.id),
        testSchemes.map((s) => s.id),
      );
      const summaryKeys = [
        "id",
        "name",
        "provider",
        "state",
        "portal_url",
        "official_source_url",
        "benefit_summary",
        "deadline",
        "last_verified_on",
        "verification_status",
      ].sort();
      for (const s of list) {
        assert.deepEqual(Object.keys(s).sort(), summaryKeys);
        assert.equal("rules" in s, false);
        assert.equal("documents" in s, false);
        assert.equal("steps" in s, false);
        assert.equal("status" in s, false);
        assert.equal("deadline_note" in s, false);
      }
    });
  });

  it("derives verification_status: conflicting beats unverified beats verified", async () => {
    const schemes: SchemeInput[] = [
      scheme("s-conflict", "Conflict", [
        conflictingRule("s-conflict", 1, { field: "annual_income", operator: "lte", value: null, label: "x" }),
        unverifiedRule("s-conflict", 2, { field: "age", operator: "lte", value: 30, label: "y" }),
        verifiedRule("s-conflict", 3, { field: "category", operator: "eq", value: "SC", label: "z" }),
      ]),
      scheme("s-unverified", "Unverified", [
        unverifiedRule("s-unverified", 1, { field: "age", operator: "lte", value: 30, label: "y" }),
        verifiedRule("s-unverified", 2, { field: "category", operator: "eq", value: "SC", label: "z" }),
      ]),
      scheme("s-verified", "Verified", [
        verifiedRule("s-verified", 1, { field: "category", operator: "eq", value: "SC", label: "z" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const list = (await (await fetch(`${base}/api/schemes`)).json()) as { id: string; verification_status: string }[];
      const status = Object.fromEntries(list.map((s) => [s.id, s.verification_status]));
      assert.deepEqual(status, {
        "s-conflict": "conflicting",
        "s-unverified": "unverified",
        "s-verified": "verified",
      });
    });
  });
});

describe("GET /api/schemes/:id", () => {
  it("returns the full scheme with rules, documents and steps", async () => {
    await withServer(testSchemes, async (base) => {
      const res = await fetch(`${base}/api/schemes/ts-alpha`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.id, "ts-alpha");
      assert.equal(body.verification_status, "verified");
      assert.equal((body.rules as unknown[]).length, 2);
      assert.equal((body.documents as unknown[]).length, 1);
      assert.equal((body.steps as unknown[]).length, 1);
      assert.equal("status" in body, false);
      assert.equal("deadline_note" in body, false);
    });
  });

  it("returns 404 for an unknown id", async () => {
    await withServer(testSchemes, async (base) => {
      const res = await fetch(`${base}/api/schemes/does-not-exist`);
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { error: "Scheme not found" });
    });
  });
});

describe("POST /api/evaluate", () => {
  const profiles = [profile1, profile2, profile3, profile6];

  it("matches the engine verdict for each scheme, for profiles 1, 2, 3 and 6", async () => {
    await withServer(testSchemes, async (base) => {
      for (const attributes of profiles) {
        const { status, text } = await post(base, { attributes });
        assert.equal(status, 200);
        const body = JSON.parse(text) as {
          groups: Record<string, { id: string; verdict: string }[]>;
        };
        const verdictById = new Map<string, string>();
        for (const list of Object.values(body.groups)) {
          for (const s of list) verdictById.set(s.id, s.verdict);
        }
        for (const s of testSchemes) {
          const expected = evaluate({ attributes, rules: s.rules }).verdict;
          assert.equal(verdictById.get(s.id), expected, `verdict for ${s.id}`);
        }
      }
    });
  });

  it("places each scheme in the group matching its verdict", async () => {
    await withServer(testSchemes, async (base) => {
      const { text } = await post(base, { attributes: profile1 });
      const body = JSON.parse(text) as {
        groups: { likely_eligible: { id: string }[]; check_one_thing: { id: string }[]; not_eligible: { id: string }[] };
      };
      assert.deepEqual(
        body.groups.likely_eligible.map((s) => s.id),
        ["ts-alpha"],
      );
      assert.deepEqual(
        body.groups.check_one_thing.map((s) => s.id),
        ["ts-beta"],
      );
      assert.deepEqual(
        body.groups.not_eligible.map((s) => s.id).sort(),
        ["ts-delta", "ts-gamma"],
      );
    });
  });

  it("sorts each group by scheme name", async () => {
    const schemes: SchemeInput[] = [
      scheme("z-id", "Zeta Scholarship", [
        verifiedRule("z-id", 1, { field: "category", operator: "eq", value: "BC", label: "Category is BC" }),
      ]),
      scheme("a-id", "Alpha Scholarship", [
        verifiedRule("a-id", 1, { field: "category", operator: "eq", value: "BC", label: "Category is BC" }),
      ]),
      scheme("m-id", "Mu Scholarship", [
        verifiedRule("m-id", 1, { field: "category", operator: "eq", value: "SC", label: "Category is SC" }),
        verifiedRule("m-id", 2, { field: "area", operator: "eq", value: "rural", label: "Area is rural" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: { category: "BC" } });
      const body = JSON.parse(text) as { groups: { likely_eligible: { name: string }[]; not_eligible: { name: string }[] } };
      const likely = body.groups.likely_eligible.map((s) => s.name);
      assert.deepEqual(likely, ["Alpha Scholarship", "Zeta Scholarship"]);
      assert.deepEqual(likely, [...likely].sort((a, b) => a.localeCompare(b)));
      assert.deepEqual(
        body.groups.not_eligible.map((s) => s.name),
        ["Mu Scholarship"],
      );
    });
  });

  it("returns 400 when attributes is not an object", async () => {
    await withServer(testSchemes, async (base) => {
      for (const attributes of ["abc", [1, 2], null]) {
        const { status, text } = await post(base, { attributes });
        assert.equal(status, 400);
        assert.equal(typeof JSON.parse(text).error, "string");
      }
      const missing = await post(base, { other: 1 });
      assert.equal(missing.status, 400);
    });
  });

  it("returns 400 naming annual_income when it is a string", async () => {
    await withServer(testSchemes, async (base) => {
      const { status, text } = await post(base, { attributes: { annual_income: "120000" } });
      assert.equal(status, 400);
      assert.match(JSON.parse(text).error, /annual_income/);
    });
  });

  it("returns 400 naming the field for an invalid category or area", async () => {
    await withServer(testSchemes, async (base) => {
      const cat = await post(base, { attributes: { category: "XX" } });
      assert.equal(cat.status, 400);
      assert.match(JSON.parse(cat.text).error, /category/);

      const area = await post(base, { attributes: { area: "suburban" } });
      assert.equal(area.status, 400);
      assert.match(JSON.parse(area.text).error, /area/);
    });
  });

  it("returns 400 for malformed JSON without echoing the body", async () => {
    await withServer(testSchemes, async (base) => {
      const { status, text } = await postRaw(base, "{bad json 123456789012");
      assert.equal(status, 400);
      assert.deepEqual(JSON.parse(text), { error: "Invalid request body" });
      assert.equal(text.includes("123456789012"), false);
    });
  });

  it("does not echo or keep an extra text field containing a 12-digit number", async () => {
    await withServer(testSchemes, async (base) => {
      const { status, text } = await post(base, {
        attributes: { category: "BC" },
        text: "My Aadhaar is 123456789012 and I study in Hyderabad",
      });
      assert.equal(status, 200);
      assert.equal(text.includes("123456789012"), false);
      assert.equal(text.includes("Hyderabad"), false);
    });
  });

  it("gives CHECK_ONE_THING, not NOT_ELIGIBLE, when attributes are missing", async () => {
    await withServer(testSchemes, async (base) => {
      const { status, text } = await post(base, { attributes: {} });
      assert.equal(status, 200);
      const body = JSON.parse(text) as {
        groups: { not_eligible: unknown[]; check_one_thing: { id: string; verdict: string }[] };
      };
      assert.deepEqual(body.groups.not_eligible, []);
      const alpha = body.groups.check_one_thing.find((s) => s.id === "ts-alpha");
      assert.ok(alpha, "ts-alpha should be in check_one_thing");
      assert.equal(alpha.verdict, "CHECK_ONE_THING");
    });
  });
});

describe("POST /api/evaluate follow-up questions", () => {
  it("includes a missing field whose verified rule is UNKNOWN", async () => {
    const schemes = [
      scheme("fu-1", "Follow One", [
        verifiedRule("fu-1", 1, { field: "course_level", operator: "in", value: ["UG"], label: "Course" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: {} });
      assert.deepEqual(JSON.parse(text).follow_up_questions, ["course_level"]);
    });
  });

  it("does not include a field whose rule is unverified", async () => {
    const schemes = [
      scheme("fu-2", "Follow Two", [
        unverifiedRule("fu-2", 1, { field: "age", operator: "lte", value: 30, label: "Age" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: {} });
      assert.deepEqual(JSON.parse(text).follow_up_questions, []);
    });
  });

  it("does not include a field whose rule is conflicting", async () => {
    const schemes = [
      scheme("fu-3", "Follow Three", [
        conflictingRule("fu-3", 1, { field: "annual_income", operator: "lte", value: null, label: "Income" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: {} });
      assert.deepEqual(JSON.parse(text).follow_up_questions, []);
    });
  });

  it("does not include a field whose rule is NOT_APPLICABLE", async () => {
    const schemes = [
      scheme("fu-4", "Follow Four", [
        verifiedRule("fu-4", 1, {
          field: "year_of_study",
          operator: "lte",
          value: 2,
          label: "Year of study",
          applies_when: { field: "area", operator: "eq", value: "urban" },
        }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: { area: "rural" } });
      assert.deepEqual(JSON.parse(text).follow_up_questions, []);
    });
  });

  it("removes duplicate field names", async () => {
    const schemes = [
      scheme("fu-5a", "Dup A", [
        verifiedRule("fu-5a", 1, { field: "course_level", operator: "in", value: ["UG"], label: "Course" }),
      ]),
      scheme("fu-5b", "Dup B", [
        verifiedRule("fu-5b", 1, { field: "course_level", operator: "eq", value: "PG", label: "Course PG" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: {} });
      assert.deepEqual(JSON.parse(text).follow_up_questions, ["course_level"]);
    });
  });

  it("caps the list at 3 entries", async () => {
    const schemes = [
      scheme("fu-6", "Many", [
        verifiedRule("fu-6", 1, { field: "annual_income", operator: "lte", value: 150000, label: "Income" }),
        verifiedRule("fu-6", 2, { field: "age", operator: "lte", value: 30, label: "Age" }),
        verifiedRule("fu-6", 3, { field: "year_of_study", operator: "lte", value: 2, label: "Year" }),
        verifiedRule("fu-6", 4, { field: "course_level", operator: "in", value: ["UG"], label: "Course" }),
      ]),
    ];
    await withServer(schemes, async (base) => {
      const { text } = await post(base, { attributes: { category: "BC" } });
      const list = JSON.parse(text).follow_up_questions as string[];
      assert.ok(list.length <= 3, `expected at most 3, got ${list.length}`);
      assert.equal(list.length, 3);
    });
  });
});
