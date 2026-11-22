import type { ProfileAttributes } from "../../../shared/types.js";

export interface ProfileExtractor {
  extract(sanitisedText: string): Promise<ProfileAttributes>;
}

/** Kept as an alias so existing references to ExtractionProvider still compile. */
export type ExtractionProvider = ProfileExtractor;

const MAX_LENGTH = 1000;
const REDACTION = "[REDACTED]";

// Matches a run of 9 or more digits, optionally separated by single spaces or hyphens
// (covers Aadhaar, phone-like and grouped numbers). Commas are not touched.
const LONG_NUMBER = /(?<!\d)\d(?:[ -]?\d){8,}(?!\d)/g;

/** Trims, caps length, and replaces long digit runs with the [REDACTED] placeholder. */
export function sanitise(text: string): string {
  return sanitiseWithFlag(text).text;
}

/** As sanitise(), and also reports whether any digit run was removed. */
export function sanitiseWithFlag(text: string): { text: string; sanitised: boolean } {
  const capped = text.trim().slice(0, MAX_LENGTH);
  let sanitised = false;
  const out = capped.replace(LONG_NUMBER, () => {
    sanitised = true;
    return REDACTION;
  });
  return { text: out, sanitised };
}
