import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { SchemeDetailResponse } from "../../../shared/contracts";
import type { ApplicationStatus, VerificationStatus } from "../../../shared/types";
import { getScheme } from "../home/api";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";
import { STATUS_LABELS } from "../tracker/TrackerScreen";
import Checklist from "./Checklist";

interface SchemeDetailProps {
  schemeId: string;
  onBack: () => void;
  onTrack: (scheme_id: string, scheme_name: string) => void;
  onOpenTracker: () => void;
  trackedStatus: ApplicationStatus | null;
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

const sectionStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const headingStyle: CSSProperties = { margin: 0, fontSize: 18 };

/** Formats an ISO date (YYYY-MM-DD) as a readable date. Falls back to the raw text if it is not a valid date. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Formats an ISO date (YYYY-MM-DD) as "22 Nov 2026". Built in UTC so the day never shifts with the local timezone. */
function formatReviewDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Full detail for one scheme: badge, official link, deadline, documents checklist and apply steps. */
export default function SchemeDetail({ schemeId, onBack, onTrack, onOpenTracker, trackedStatus }: SchemeDetailProps) {
  const [detail, setDetail] = useState<SchemeDetailResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setDetail(null);
    getScheme(schemeId)
      .then((response) => {
        if (!active) return;
        setDetail(response);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [schemeId]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <button type="button" style={buttonStyle} onClick={onBack}>
          {t.backToResults}
        </button>
      </div>

      {status === "loading" && <p style={{ margin: 0 }}>{t.schemeLoading}</p>}

      {status === "error" && (
        <p role="alert" style={{ margin: 0, color: "#B91C1C" }}>
          {t.schemeError}
        </p>
      )}

      {status === "ready" && detail !== null && (
        <>
          <h2 style={{ margin: 0, fontSize: 22 }}>{detail.name}</h2>
          <p style={{ margin: 0, fontSize: 15 }}>{detail.provider}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            {trackedStatus === null ? (
              <button type="button" style={buttonStyle} onClick={() => onTrack(detail.id, detail.name)}>
                {t.trackThis}
              </button>
            ) : (
              <>
                <p style={{ margin: 0 }}>
                  <strong>{t.trackingStatus}: </strong>
                  {STATUS_LABELS[trackedStatus]}
                </p>
                <button type="button" style={buttonStyle} onClick={onOpenTracker}>
                  {t.trackingOpen}
                </button>
              </>
            )}
          </div>

          <p style={{ margin: 0 }}>{detail.benefit_summary}</p>

          <span
            style={{
              alignSelf: "flex-start",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 14,
              ...BADGES[detail.verification_status].style,
            }}
          >
            {BADGES[detail.verification_status].label}
          </span>
          <p style={{ margin: 0, fontSize: 14 }}>
            {detail.last_verified_on === null
              ? t.notYetReviewed
              : t.lastReviewed.replace("{date}", formatReviewDate(detail.last_verified_on))}
          </p>

          <a
            href={detail.official_source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", minHeight: theme.minTapTargetPx, color: theme.colors.accent }}
          >
            {t.officialSource}
          </a>

          {detail.deadline === null ? (
            <p style={{ margin: 0 }}>{t.datesNotAnnounced}</p>
          ) : (
            <p style={{ margin: 0 }}>
              <strong>{t.deadlineLabel}: </strong>
              {formatDate(detail.deadline)}
            </p>
          )}

          <section aria-labelledby="scheme-documents" style={sectionStyle}>
            <h3 id="scheme-documents" style={headingStyle}>
              {t.documentsHeading}
            </h3>
            {detail.documents.length === 0 ? (
              <p style={{ margin: 0 }}>{t.noDocuments}</p>
            ) : (
              <Checklist key={detail.id} schemeId={detail.id} documents={detail.documents} />
            )}
          </section>

          <section aria-labelledby="scheme-steps" style={sectionStyle}>
            <h3 id="scheme-steps" style={headingStyle}>
              {t.stepsHeading}
            </h3>
            {detail.steps.length === 0 ? (
              <p style={{ margin: 0 }}>{t.noSteps}</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {detail.steps.map((step, index) => (
                  <li key={index}>
                    <span>{step.description}</span>{" "}
                    <a
                      href={step.official_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: theme.colors.accent }}
                    >
                      {t.officialSource}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
