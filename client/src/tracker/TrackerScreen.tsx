import type { CSSProperties } from "react";
import type { ApplicationStatus } from "../../../shared/types";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";
import { daysLeft } from "./ReminderBanner";
import type { TrackedApplication } from "./storage";

/** Step order for the tracker. Students can move to any step in either direction. */
export const STATUS_ORDER: readonly ApplicationStatus[] = ["saved", "docs_ready", "applied", "verified", "sanctioned"];

/** Display label for each status, from the locale file. */
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: t.stepSaved,
  docs_ready: t.stepDocsReady,
  applied: t.stepApplied,
  verified: t.stepVerified,
  sanctioned: t.stepSanctioned,
};

interface TrackerScreenProps {
  applications: TrackedApplication[];
  onStatusChange: (scheme_id: string, status: ApplicationStatus) => void;
  onDeadlineChange: (scheme_id: string, value: string | null) => void;
  onUntrack: (scheme_id: string) => void;
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

const inputStyle: CSSProperties = {
  minHeight: theme.minTapTargetPx,
  padding: "8px 12px",
  fontSize: 16,
  fontFamily: theme.font,
  color: theme.colors.text,
  background: theme.colors.background,
  border: `2px solid ${theme.colors.accent}`,
  borderRadius: 8,
  boxSizing: "border-box",
  maxWidth: "100%",
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  border: `1px solid ${theme.colors.accent}`,
  borderRadius: 8,
};

const stepListStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const headingStyle: CSSProperties = { margin: 0, fontSize: 18 };

/** Days-left text for a deadline: "due today", "Overdue", or "<n> days left". */
function daysLeftText(deadline: string): string {
  const days = daysLeft(deadline);
  if (days === 0) return t.dueToday;
  if (days < 0) return t.overdue;
  return `${days} ${t.daysLeftSuffix}`;
}

/** Lists every tracked scholarship with its step, status, deadline and days left. */
export default function TrackerScreen({ applications, onStatusChange, onDeadlineChange, onUntrack }: TrackerScreenProps) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{t.trackerHeading}</h2>

      {applications.length === 0 ? (
        <p style={{ margin: 0 }}>{t.trackerEmpty}</p>
      ) : (
        applications.map((app) => {
          const currentIndex = STATUS_ORDER.indexOf(app.status);
          const statusId = `tracker-status-${app.scheme_id}`;
          const deadlineId = `tracker-deadline-${app.scheme_id}`;
          return (
            <article key={app.scheme_id} style={cardStyle}>
              <h3 style={headingStyle}>{app.scheme_name}</h3>

              <ol style={stepListStyle}>
                {STATUS_ORDER.map((step, index) => {
                  const isCurrent = index === currentIndex;
                  return (
                    <li
                      key={step}
                      aria-current={isCurrent ? "step" : undefined}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 14,
                        border: isCurrent ? `2px solid ${theme.colors.accent}` : "1px dashed #4B5563",
                        fontWeight: isCurrent ? 700 : 400,
                      }}
                    >
                      {STATUS_LABELS[step]}
                    </li>
                  );
                })}
              </ol>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor={statusId}>{t.statusLabel}</label>
                <select
                  id={statusId}
                  value={app.status}
                  style={inputStyle}
                  onChange={(event) => onStatusChange(app.scheme_id, event.target.value as ApplicationStatus)}
                >
                  {STATUS_ORDER.map((step) => (
                    <option key={step} value={step}>
                      {STATUS_LABELS[step]}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor={deadlineId}>{t.myDeadline}</label>
                <input
                  id={deadlineId}
                  type="date"
                  value={app.my_deadline ?? ""}
                  style={inputStyle}
                  onChange={(event) => onDeadlineChange(app.scheme_id, event.target.value === "" ? null : event.target.value)}
                />
                {app.my_deadline !== null && <p style={{ margin: 0 }}>{daysLeftText(app.my_deadline)}</p>}
              </div>

              <div>
                <button type="button" style={buttonStyle} onClick={() => onUntrack(app.scheme_id)}>
                  {t.stopTracking}
                </button>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
