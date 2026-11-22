import type { CSSProperties } from "react";
import { useState } from "react";
import type { ProfileAttributes, ProfileCategory } from "../../../shared/types";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";

type FieldKey = "category" | "annual_income" | "area" | "course_level" | "age" | "year_of_study";

interface ProfileReviewProps {
  attributes: ProfileAttributes;
  onChange: (attributes: ProfileAttributes) => void;
  onSeeScholarships: () => void;
  followUpQuestions: string[];
  error?: string;
}

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "category", label: t.fieldCategory },
  { key: "annual_income", label: t.fieldAnnualIncome },
  { key: "area", label: t.fieldArea },
  { key: "course_level", label: t.fieldCourseLevel },
  { key: "age", label: t.fieldAge },
  { key: "year_of_study", label: t.fieldYearOfStudy },
];

const CATEGORY_OPTIONS: ProfileCategory[] = ["OC", "BC", "SC", "ST", "MINORITY", "EBC"];

/** Display labels keyed by API value. The API values themselves are never changed. */
const CATEGORY_LABELS: Record<string, string> = {
  OC: t.categoryOC,
  BC: t.categoryBC,
  SC: t.categorySC,
  ST: t.categoryST,
  MINORITY: t.categoryMinority,
  EBC: t.categoryEBC,
};

const AREA_LABELS: Record<string, string> = {
  rural: t.areaRural,
  urban: t.areaUrban,
};

const COURSE_LABELS: Record<string, string> = {
  CLASS_9: t.courseClass9,
  CLASS_10: t.courseClass10,
  INTERMEDIATE: t.courseIntermediate,
  UG: t.courseUg,
  PG: t.coursePg,
};

const AREA_OPTIONS: { value: "rural" | "urban"; label: string }[] = [
  { value: "rural", label: t.areaRural },
  { value: "urban", label: t.areaUrban },
];

const COURSE_OPTIONS: { value: string; label: string }[] = [
  { value: "CLASS_9", label: t.courseClass9 },
  { value: "CLASS_10", label: t.courseClass10 },
  { value: "INTERMEDIATE", label: t.courseIntermediate },
  { value: "UG", label: t.courseUg },
  { value: "PG", label: t.coursePg },
];

const NUMERIC_FIELDS: FieldKey[] = ["annual_income", "age", "year_of_study"];

function isNumericField(key: FieldKey): boolean {
  return NUMERIC_FIELDS.includes(key);
}

/** Looks up a display label; falls back to the raw value when the key is unknown. */
function labelFor(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

function displayValue(key: FieldKey, value: string | number): string {
  if (key === "annual_income") return `₹${Number(value).toLocaleString("en-IN")}`;
  if (key === "category") return labelFor(CATEGORY_LABELS, String(value));
  if (key === "area") return labelFor(AREA_LABELS, String(value));
  if (key === "course_level") return labelFor(COURSE_LABELS, String(value));
  return String(value);
}

const chipBase: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: theme.minTapTargetPx,
  padding: "10px 14px",
  fontSize: 16,
  fontFamily: theme.font,
  color: theme.colors.text,
  background: theme.colors.background,
  borderRadius: 8,
  textAlign: "left",
  cursor: "pointer",
};

const filledChip: CSSProperties = { ...chipBase, border: `2px solid ${theme.colors.accent}` };
const missingChip: CSSProperties = { ...chipBase, border: `2px dashed ${theme.colors.accent}` };

const controlStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: theme.minTapTargetPx,
  padding: "8px 12px",
  fontSize: 16,
  fontFamily: theme.font,
  color: theme.colors.text,
  border: "1px solid #9CA3AF",
  borderRadius: 8,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: theme.minTapTargetPx,
  padding: "12px 20px",
  fontSize: 18,
  fontFamily: theme.font,
  fontWeight: 600,
  color: theme.colors.background,
  background: theme.colors.accent,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

/** Shows the extracted attributes as editable chips, plus read-only follow-up questions. */
export default function ProfileReview({
  attributes,
  onChange,
  onSeeScholarships,
  followUpQuestions,
  error,
}: ProfileReviewProps) {
  const [openKey, setOpenKey] = useState<FieldKey | null>(null);
  const questions = followUpQuestions.slice(0, 3);

  function updateField(key: FieldKey, raw: string) {
    let next: string | number | null;
    if (raw === "") next = null;
    else if (isNumericField(key)) next = Number(raw);
    else next = raw;
    onChange({ ...attributes, [key]: next } as ProfileAttributes);
  }

  function renderEditor(key: FieldKey, label: string) {
    const current = attributes[key];
    const value = current === null || current === undefined ? "" : String(current);
    if (key === "category") {
      return (
        <select aria-label={label} value={value} onChange={(e) => updateField(key, e.target.value)} style={controlStyle}>
          <option value="">{t.noneOption}</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {labelFor(CATEGORY_LABELS, option)}
            </option>
          ))}
        </select>
      );
    }
    if (key === "area") {
      return (
        <select aria-label={label} value={value} onChange={(e) => updateField(key, e.target.value)} style={controlStyle}>
          <option value="">{t.noneOption}</option>
          {AREA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {labelFor(AREA_LABELS, option.value)}
            </option>
          ))}
        </select>
      );
    }
    if (key === "course_level") {
      return (
        <select aria-label={label} value={value} onChange={(e) => updateField(key, e.target.value)} style={controlStyle}>
          <option value="">{t.noneOption}</option>
          {COURSE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {labelFor(COURSE_LABELS, option.value)}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="number"
        aria-label={label}
        min={0}
        value={value}
        onChange={(e) => updateField(key, e.target.value)}
        style={controlStyle}
      />
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{t.reviewHeading}</p>
      <p style={{ margin: 0, fontSize: 15 }}>{t.reviewHint}</p>

      <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {FIELDS.map((field) => {
          const value = attributes[field.key];
          const missing = value === null || value === undefined;
          const isOpen = openKey === field.key;
          return (
            <li key={field.key} style={{ listStyle: "none" }}>
              <button
                type="button"
                aria-expanded={isOpen}
                style={missing ? missingChip : filledChip}
                onClick={() => setOpenKey(isOpen ? null : field.key)}
              >
                {missing ? `${t.addPrefix} ${field.label}` : `${field.label}: ${displayValue(field.key, value)}`}
              </button>
              {isOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {renderEditor(field.key, field.label)}
                  <button
                    type="button"
                    onClick={() => setOpenKey(null)}
                    style={{ ...chipBase, width: "auto", border: `2px solid ${theme.colors.accent}` }}
                  >
                    {t.editorDone}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {questions.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{t.followUpHeading}</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {questions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" style={{ margin: 0, color: "#B91C1C" }}>
          {error}
        </p>
      )}

      <button type="button" style={primaryButtonStyle} onClick={onSeeScholarships}>
        {t.seeScholarships}
      </button>
    </section>
  );
}
