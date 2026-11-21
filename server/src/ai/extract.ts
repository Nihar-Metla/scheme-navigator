import type { ProfileAttributes } from "../../../shared/types.js";

export interface ExtractionProvider {
  extract(sanitisedText: string): Promise<ProfileAttributes>;
}

/** Replaces 12-digit Aadhaar-like numbers (optionally space-separated in groups of four) with a placeholder. */
export function sanitise(text: string): string {
  return text.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[REDACTED]");
}
