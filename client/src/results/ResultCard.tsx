import { useState } from "react";
import type { CSSProperties } from "react";
import type { EvaluatedScheme } from "../../../shared/contracts";
import type { EvalResult, VerificationStatus } from "../../../shared/types";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";

interface ResultCardProps {
  scheme: EvaluatedScheme;
  onViewDetails?: (id: string) => void;
}

const BADGES: Record<VerificationStatus, { label: string; style: CSSProperties }> = {
  verified: {
    label: t.badgeVerified,
    style: { border: "2px solid #166534", background: "#DCFCE7", color: "#14532D" },
  },
  unverified: {
    label: t.badgeUnverified,
    style: { border: "2px dashed #4B5563", background: "#F3F4F6", color: "#374151" },
  },
  conflicting: {
    label: t.badgeConflicting,
    style: { border: "2px solid #92400E", background: "#FEF3C7", color: "#78350F", fontWeight: 700 },
  },
};

/** Symbol and spoken meaning for a rule result. NOT_APPLICABLE and anything else gets no symbol. */
function markFor(result: EvalResult): { symbol: string; meaning: string } | null {
  switch (result) {
    case "PASS":
      return { symbol: "✓", meaning: t.rulePass };
    case "FAIL":
      return { symbol: "✗", meaning: t.ruleFail };
    case "UNKNOWN":
      return { symbol: "?", meaning: t.ruleUnknown };
    default:
      return null;
  }
}

const buttonStyle: CSSProperties = {
  minHeight: theme.minTapTargetPx,
  minWidth: theme.minTapTargetPx,
  padding: "8px 16px",
  fontSize: 16,
  fontFamily: theme.font,
  color: theme.colors.accent,
  background: theme.colors.background,
  border: `2px solid ${theme.colors.accent}`,
  borderRadius: 8,
  cursor: "pointer",
};

/** One scheme with its verification badge, official link and expandable rule explanations. */
export default function ResultCard({ scheme, onViewDetails }: ResultCardProps) {
  const [open, setOpen] = useState(false);
  const badge = BADGES[scheme.verification_status];
  const panelId = `why-${scheme.id}`;

  return (
    <article
      style={{
        border: "1px solid #D1D5DB",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 18 }}>{scheme.name}</h3>
      <p style={{ margin: 0, fontSize: 15 }}>{scheme.provider}</p>
      <p style={{ margin: 0 }}>{scheme.benefit_summary}</p>

      <span
        style={{
          alignSelf: "flex-start",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: 14,
          ...badge.style,
        }}
      >
        {badge.label}
      </span>

      <a
        href={scheme.official_source_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: theme.minTapTargetPx,
          color: theme.colors.accent,
        }}
      >
        {t.officialSource}
      </a>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          style={buttonStyle}
          onClick={() => setOpen((current) => !current)}
        >
          {t.whyButton}
        </button>
        {onViewDetails ? (
          <button type="button" style={buttonStyle} onClick={() => onViewDetails(scheme.id)}>
            {t.viewDetails}
          </button>
        ) : (
          <button type="button" disabled style={{ ...buttonStyle, opacity: 0.5, cursor: "default" }}>
            {t.viewDetails}
          </button>
        )}
      </div>

      {open && (
        <ul
          id={panelId}
          style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          {scheme.rule_results.map((rule) => {
            const mark = markFor(rule.result);
            return (
              <li key={rule.rule_id}>
                {mark && (
                  <span role="img" aria-label={mark.meaning} style={{ fontWeight: 700, marginRight: 6 }}>
                    {mark.symbol}
                  </span>
                )}
                {rule.explanation}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
