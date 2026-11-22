import type { EvaluateResponse } from "../../../shared/contracts";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";
import ResultCard from "./ResultCard";
import type { CSSProperties } from "react";

interface ResultsScreenProps {
  response: EvaluateResponse;
  onChangeDetails: () => void;
}

const SECTIONS: { key: keyof EvaluateResponse["groups"]; heading: string }[] = [
  { key: "likely_eligible", heading: t.likelyEligible },
  { key: "check_one_thing", heading: t.checkOneThing },
  { key: "not_eligible", heading: t.notEligible },
];

const secondaryButtonStyle: CSSProperties = {
  minHeight: theme.minTapTargetPx,
  padding: "12px 20px",
  fontSize: 18,
  fontFamily: theme.font,
  fontWeight: 600,
  color: theme.colors.accent,
  background: theme.colors.background,
  border: `2px solid ${theme.colors.accent}`,
  borderRadius: 8,
  cursor: "pointer",
};

/** Renders the evaluator's groups exactly as returned. No eligibility logic lives here. */
export default function ResultsScreen({ response, onChangeDetails }: ResultsScreenProps) {
  const total = SECTIONS.reduce((sum, section) => sum + response.groups[section.key].length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {total === 0 && <p style={{ margin: 0 }}>{t.emptyResults}</p>}

      {SECTIONS.map((section) => {
        const schemes = response.groups[section.key];
        if (schemes.length === 0) return null;
        const headingId = `results-${section.key}`;
        return (
          <section key={section.key} aria-labelledby={headingId} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 id={headingId} style={{ margin: 0, fontSize: 20 }}>
              {section.heading} ({schemes.length})
            </h2>
            <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {schemes.map((scheme) => (
                <li key={scheme.id} style={{ listStyle: "none" }}>
                  <ResultCard scheme={scheme} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <button type="button" style={secondaryButtonStyle} onClick={onChangeDetails}>
        {t.changeDetails}
      </button>
    </div>
  );
}
