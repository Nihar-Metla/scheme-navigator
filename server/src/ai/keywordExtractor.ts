import type { ProfileAttributes } from "../../../shared/types.js";
import type { ProfileExtractor } from "./extract.js";

/**
 * Rule-based extractor. Operates on already-sanitised text.
 * Only sets attributes it is confident about; anything absent stays unset.
 * It never infers a value from place names or from unrelated numbers.
 */
export class KeywordExtractor implements ProfileExtractor {
  async extract(sanitisedText: string): Promise<ProfileAttributes> {
    const t = sanitisedText;
    const out: ProfileAttributes = {};

    const category = findCategory(t);
    if (category !== undefined) out.category = category;

    const income = findAnnualIncome(t);
    if (income !== undefined) out.annual_income = income;

    const area = findArea(t);
    if (area !== undefined) out.area = area;

    const courseLevel = findCourseLevel(t);
    if (courseLevel !== undefined) out.course_level = courseLevel;

    const year = findYearOfStudy(t);
    if (year !== undefined) out.year_of_study = year;

    const age = findAge(t);
    if (age !== undefined) out.age = age;

    return out;
  }
}

function findCategory(t: string): ProfileAttributes["category"] | undefined {
  if (/\bSC\b/i.test(t)) return "SC";
  if (/\bST\b/i.test(t)) return "ST";
  if (/\bBC[- ]?[A-E]\b/i.test(t)) return "BC";
  if (/\bEBC\b/i.test(t)) return "EBC";
  if (/\bOC\b/i.test(t)) return "OC";
  if (/\bminority\b/i.test(t)) return "MINORITY";
  return undefined;
}

function findAnnualIncome(t: string): number | undefined {
  // "1.2 lakh", "1.2 lakhs", "1.2 lac", "1.2L"
  const lakh = /(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|L)\b/i.exec(t);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000);

  // "₹1,20,000", "Rs 120000", "Rs. 1,20,000"
  const rupee = /(?:₹|\bRs\.?)\s*(\d{1,3}(?:,\d{2,3})+|\d+)/i.exec(t);
  if (rupee) return Number(rupee[1].replace(/,/g, ""));

  // Plain number, only when an income-related word comes before it.
  // Requires 4+ digits and excludes year-like values, so ages, classes and years never match.
  const ctx = /\b(?:income|earns?|earning|salary|family|lakhs?)\b[^\d\n]{0,25}?(\d[\d,]*)/i.exec(t);
  if (ctx) {
    const digits = ctx[1].replace(/,/g, "");
    if (digits.length >= 4 && !/^(19|20)\d{2}$/.test(digits)) {
      return Number(digits);
    }
  }
  return undefined;
}

function findArea(t: string): "rural" | "urban" | undefined {
  const rural = /\b(?:village|rural|mandal)\b/i.test(t);
  const urban = /\b(?:city|town|urban)\b/i.test(t);
  if (rural && !urban) return "rural";
  if (urban && !rural) return "urban";
  return undefined;
}

function findCourseLevel(t: string): string | undefined {
  // Case-sensitive abbreviations avoid matching ordinary words such as "be" or "ba".
  if (/\b(?:MSc|MA|MCom|M\.?Com|MBA|M\.?Tech)\b/.test(t) || /\b(?:PG|masters?)\b/i.test(t)) {
    return "PG";
  }
  if (/\b(?:BSc|BCom|B\.?Com|BA|B\.?Tech|BE|UG)\b/.test(t) || /\b(?:degree|graduation)\b/i.test(t)) {
    return "UG";
  }
  if (/\bclass\s*9(?:st|nd|rd|th)?\b|\b9th\b/i.test(t)) return "CLASS_9";
  if (/\bclass\s*10(?:st|nd|rd|th)?\b|\b10th\b/i.test(t)) return "CLASS_10";
  if (/\b(?:intermediate|inter|11th|12th)\b/i.test(t)) return "INTERMEDIATE";
  return undefined;
}

const YEAR_WORDS: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
};

function findYearOfStudy(t: string): number | undefined {
  const m = /\b(first|1st|second|2nd|third|3rd|fourth|4th)(?:[- ]year)?\b/i.exec(t);
  if (!m) return undefined;
  return YEAR_WORDS[m[1].toLowerCase()];
}

function findAge(t: string): number | undefined {
  const patterns = [
    /\b(?:I['’]?m|I am|aged?)\s+(\d{1,3})\b/gi,
    /\b(\d{1,3})\s+years?\b/gi,
  ];
  for (const p of patterns) {
    for (const m of t.matchAll(p)) {
      const age = Number(m[1]);
      if (age >= 10 && age <= 60) return age;
    }
  }
  return undefined;
}
