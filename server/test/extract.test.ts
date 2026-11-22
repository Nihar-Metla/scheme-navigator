import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { sanitise } from "../src/ai/extract.js";
import { KeywordExtractor } from "../src/ai/keywordExtractor.js";
import { createApp } from "../src/api/app.js";

const extractor = new KeywordExtractor();

/** Mirrors the route: sanitise first, then extract. */
async function run(text: string) {
  return extractor.extract(sanitise(text));
}

const LONG_DIGIT_RUN = /\d(?:[ -]?\d){8,}/;

// A. Fixture-style profiles.
// Fixture notes: profile2 says area urban (Hyderabad is not inferred, so area is not asserted).
// profile3 has course_level null in the fixture (not asserted). profile4 has year 9 in the fixture (not asserted).
// profile5 says course_level PG in the fixture (not asserted; BCom is UG).

test("A1 full profile with rural, UG, BC-B, lakh income", async () => {
  const a = await run("I'm 19, first-year BSc in a village in Nalgonda, BC-B, family income around ₹1.2 lakh.");
  assert.equal(a.age, 19);
  assert.equal(a.year_of_study, 1);
  assert.equal(a.course_level, "UG");
  assert.equal(a.area, "rural");
  assert.equal(a.category, "BC");
  assert.equal(a.annual_income, 120000);
});

test("A2 second-year B.Tech, SC, 2.3 lakh; area not inferred from Hyderabad", async () => {
  const a = await run("I'm in second-year B.Tech in Hyderabad, SC, family income ₹2.3 lakh.");
  assert.equal(a.year_of_study, 2);
  assert.equal(a.course_level, "UG");
  assert.equal(a.category, "SC");
  assert.equal(a.annual_income, 230000);
  assert.equal(a.area, undefined);
  assert.equal(a.age, undefined);
});

test("A3 BC-D, 1.8 lakh, rural, degree", async () => {
  const a = await run("BC-D, annual income ₹1.8 lakh, rural, pursuing a degree.");
  assert.equal(a.category, "BC");
  assert.equal(a.annual_income, 180000);
  assert.equal(a.area, "rural");
  assert.equal(a.course_level, "UG");
});

test("A4 Class 9, ST, Adilabad", async () => {
  const a = await run("Class 9 student, ST, from Adilabad, parents are labourers.");
  assert.equal(a.course_level, "CLASS_9");
  assert.equal(a.category, "ST");
  assert.equal(a.area, undefined);
  assert.equal(a.annual_income, undefined);
  assert.equal(a.age, undefined);
  assert.equal(a.year_of_study, undefined);
});

test("A5 minority, age 27, BCom with 64% (64 is not age)", async () => {
  const a = await run("Minority student, age 27, completed BCom with 64%, interested in pursuing MS abroad.");
  assert.equal(a.category, "MINORITY");
  assert.equal(a.age, 27);
  assert.equal(a.annual_income, undefined);
  assert.notEqual(a.age, 64);
  // course_level is not asserted here (fixture profile5 says PG).
});

test("A6 OC, 1 lakh, Intermediate first year", async () => {
  const a = await run("OC student, annual income ₹1 lakh, Intermediate first year.");
  assert.equal(a.category, "OC");
  assert.equal(a.annual_income, 100000);
  assert.equal(a.course_level, "INTERMEDIATE");
  assert.equal(a.year_of_study, 1);
});

// B. Mixed sentence.
test("B age, UG, income and rural from one sentence", async () => {
  const a = await run("I'm 19, studying BSc, family income is ₹1.2 lakh, from a village");
  assert.equal(a.age, 19);
  assert.equal(a.course_level, "UG");
  assert.equal(a.annual_income, 120000);
  assert.equal(a.area, "rural");
});

// C. Income forms.
test("C income forms all resolve to 120000", async () => {
  const cases = [
    "family income 1.2 lakh",
    "income 1.2L",
    "family income ₹1,20,000",
    "family income Rs. 1,20,000",
    "family earns 120000",
  ];
  for (const text of cases) {
    const a = await run(text);
    assert.equal(a.annual_income, 120000, `case: ${text}`);
  }
});

// D. Plain number with age.
test("D age 19 and income 120000 together", async () => {
  const a = await run("age 19, income 120000");
  assert.equal(a.age, 19);
  assert.equal(a.annual_income, 120000);
});

// E. Long digit runs are redacted and never become income or age.
test("E long digit runs are redacted and yield no income or age", async () => {
  const inputs = ["987654321", "9876543210", "98765-43210", "123456789012", "1234 5678 9012", "1234-5678-9012"];
  for (const text of inputs) {
    const s = sanitise(text);
    assert.doesNotMatch(s, LONG_DIGIT_RUN, `case: ${text}`);
    const a = await extractor.extract(s);
    assert.equal(a.annual_income, undefined, `case: ${text}`);
    assert.equal(a.age, undefined, `case: ${text}`);
  }
});

// F. Mixed identifiers and income.
test("F identifiers redacted, income still extracted", async () => {
  const text = "Aadhaar 1234 5678 9012, phone 98765-43210, family income ₹1.2 lakh";
  const s = sanitise(text);
  assert.doesNotMatch(s, LONG_DIGIT_RUN);
  const a = await extractor.extract(s);
  assert.equal(a.annual_income, 120000);
});

// G. No attributes.
test("G text with no attributes returns no keys and no error", async () => {
  const a = await run("hello");
  assert.equal(a.category, undefined);
  assert.equal(a.annual_income, undefined);
  assert.equal(a.area, undefined);
  assert.equal(a.course_level, undefined);
  assert.equal(a.year_of_study, undefined);
  assert.equal(a.age, undefined);
});

// J. Sanitiser keeps commas.
test("J sanitise leaves rupee comma format untouched", () => {
  assert.equal(sanitise("₹1,20,000"), "₹1,20,000");
});

// Route tests.
async function withServer(fn: (base: string) => Promise<void>): Promise<void> {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

async function post(base: string, body: unknown): Promise<Response> {
  return fetch(`${base}/api/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// H. Input text is not echoed back.
test("H POST response does not echo the submitted text", async () => {
  await withServer(async (base) => {
    const res = await post(base, { text: "MARKER_XYZ_42 I'm 19" });
    assert.equal(res.status, 200);
    const raw = await res.text();
    assert.doesNotMatch(raw, /MARKER_XYZ_42/);
    const body = JSON.parse(raw) as { attributes: { age?: number } };
    assert.equal(body.attributes.age, 19);
  });
});

// I. Invalid bodies return 400.
test("I invalid text bodies return 400", async () => {
  await withServer(async (base) => {
    const bodies: unknown[] = [{ text: "" }, { text: "   " }, {}, { text: 123 }];
    for (const body of bodies) {
      const res = await post(base, body);
      assert.equal(res.status, 400, `case: ${JSON.stringify(body)}`);
      assert.deepEqual(await res.json(), { error: "Invalid request body" });
    }
  });
});
