import type { CSSProperties } from "react";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";
import type { TrackedApplication } from "./storage";

const MS_PER_DAY = 86400000;

/** Whole calendar days from today to the deadline (0 = today, negative = overdue). Uses local midnights. */
export function daysLeft(deadline: string, today: Date = new Date()): number {
  const [y, m, d] = deadline.split("-").map(Number);
  const deadlineMidnight = new Date(y, m - 1, d);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((deadlineMidnight.getTime() - todayMidnight.getTime()) / MS_PER_DAY);
}

interface ReminderBannerProps {
  applications: TrackedApplication[];
  dismissed: boolean;
  onDismiss: () => void;
  onOpen: () => void;
}

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  border: `2px solid ${theme.colors.accent}`,
  borderRadius: 8,
  background: theme.colors.background,
  color: theme.colors.text,
};

const itemStyle: CSSProperties = {
  minHeight: theme.minTapTargetPx,
  padding: "8px 12px",
  fontSize: 16,
  fontFamily: theme.font,
  textAlign: "left",
  color: theme.colors.text,
  background: theme.colors.background,
  border: `1px solid ${theme.colors.accent}`,
  borderRadius: 8,
  cursor: "pointer",
};

const dismissStyle: CSSProperties = {
  alignSelf: "flex-start",
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

/** Shows tracked applications whose deadline is within 7 days or already passed. Dismissal is in memory only. */
export default function ReminderBanner({ applications, dismissed, onDismiss, onOpen }: ReminderBannerProps) {
  if (dismissed) return null;

  const items = applications.flatMap((app) => {
    if (app.status === "sanctioned" || app.my_deadline === null) return [];
    const days = daysLeft(app.my_deadline);
    if (days < 0) return [{ key: app.scheme_id, message: `${app.scheme_name}: ${t.reminderOverdue}` }];
    if (days > 7) return [];
    if (days === 0) return [{ key: app.scheme_id, message: `${app.scheme_name}: ${t.dueToday}` }];
    return [{ key: app.scheme_id, message: `${app.scheme_name}: ${days} ${t.daysLeftSuffix}` }];
  });

  if (items.length === 0) return null;

  return (
    <section aria-label={t.bannerRegion} style={sectionStyle}>
      {items.map((item) => (
        <button key={item.key} type="button" style={itemStyle} onClick={onOpen}>
          {item.message}
        </button>
      ))}
      <button type="button" style={dismissStyle} onClick={onDismiss}>
        {t.bannerDismiss}
      </button>
    </section>
  );
}
