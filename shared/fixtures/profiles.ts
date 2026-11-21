/**
 * Six fictional test profiles from BRIEF §8. Owned by Member A.
 * Type-only import; no runtime dependencies.
 *
 * Each profile is an expected scenario, not a verified determination.
 * Attributes the scenario does not state are null.
 */
import type { ProfileAttributes } from "../types";

/** expected scenario, not a verified determination. 19, first-year UG, rural, BC, ~₹1.2 lakh. */
export const profile1: ProfileAttributes = {
  // expected scenario, not a verified determination
  age: 19,
  course_level: "UG",
  year_of_study: 1,
  area: "rural",
  category: "BC",
  annual_income: 120000,
};

/** expected scenario, not a verified determination. Second-year UG, urban, SC, ₹2.3 lakh. Age not stated. */
export const profile2: ProfileAttributes = {
  // expected scenario, not a verified determination
  age: null,
  course_level: "UG",
  year_of_study: 2,
  area: "urban",
  category: "SC",
  annual_income: 230000,
};

/**
 * expected scenario, not a verified determination.
 * The brief says "BC-D". ProfileCategory has no subcategories in the MVP, so this maps to "BC".
 * The ₹1.5 lakh rural limit cited for this profile is UNVERIFIED. It is not a confirmed condition.
 */
export const profile3: ProfileAttributes = {
  // expected scenario, not a verified determination
  age: null,
  course_level: null,
  year_of_study: null,
  area: "rural",
  category: "BC",
  annual_income: 180000,
};

/** expected scenario, not a verified determination. Class 9, ST, rural. Income and age not stated. */
export const profile4: ProfileAttributes = {
  // expected scenario, not a verified determination
  age: null,
  course_level: "CLASS_9",
  year_of_study: 9,
  area: "rural",
  category: "ST",
  annual_income: null,
};

/** expected scenario, not a verified determination. Minority, age 27, PG. Income and area not stated. */
export const profile5: ProfileAttributes = {
  // expected scenario, not a verified determination
  age: 27,
  course_level: "PG",
  year_of_study: null,
  area: null,
  category: "MINORITY",
  annual_income: null,
};

/**
 * expected scenario, not a verified determination.
 * No category scheme matches OC. The EBC route is a pointer only, not an invented eligibility.
 */
export const profile6: ProfileAttributes = {
  // expected scenario, not a verified determination
  age: null,
  course_level: "INTERMEDIATE",
  year_of_study: 1,
  area: null,
  category: "OC",
  annual_income: 100000,
};

/** All six fictional profiles, in BRIEF §8 order. */
export const fictionalProfiles: ProfileAttributes[] = [
  profile1,
  profile2,
  profile3,
  profile4,
  profile5,
  profile6,
];
