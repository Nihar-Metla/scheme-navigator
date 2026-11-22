import type { ApplicationStatus } from "../../../shared/types";

const APPLICATIONS_KEY = "haq.applications";

const STATUSES: readonly ApplicationStatus[] = ["saved", "docs_ready", "applied", "verified", "sanctioned"];

/** One scholarship the student is tracking. Holds no personal details beyond the chosen deadline. */
export type TrackedApplication = {
  scheme_id: string;
  scheme_name: string;
  status: ApplicationStatus;
  /** Student-entered deadline (YYYY-MM-DD) or null. */
  my_deadline: string | null;
  /** ISO timestamp of the last change to status or deadline. */
  updated_at: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True when value is a YYYY-MM-DD string that is a real calendar date. */
export function isValidDeadline(value: unknown): boolean {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}

/** Returns the value if it is a valid YYYY-MM-DD date, otherwise null. */
export function normalizeDeadline(value: unknown): string | null {
  return isValidDeadline(value) ? (value as string) : null;
}

function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Keeps only well-formed entries from untrusted stored JSON. */
function toApplication(value: unknown): TrackedApplication | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.scheme_id !== "string" || raw.scheme_id === "") return null;
  if (typeof raw.scheme_name !== "string") return null;
  if (!isStatus(raw.status)) return null;
  if (typeof raw.updated_at !== "string") return null;
  return {
    scheme_id: raw.scheme_id,
    scheme_name: raw.scheme_name,
    status: raw.status,
    my_deadline: normalizeDeadline(raw.my_deadline),
    updated_at: raw.updated_at,
  };
}

/** Reads the tracked list. Returns [] if storage is missing, unreadable or not an array. */
export function loadApplications(): TrackedApplication[] {
  try {
    const raw = window.localStorage.getItem(APPLICATIONS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const list: TrackedApplication[] = [];
    for (const element of parsed) {
      const entry = toApplication(element);
      if (entry === null || seen.has(entry.scheme_id)) continue;
      seen.add(entry.scheme_id);
      list.push(entry);
    }
    return list;
  } catch {
    return [];
  }
}

/** Writes the tracked list. Never throws; storage may be unavailable. */
export function saveApplications(list: TrackedApplication[]): void {
  try {
    window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (e.g. private mode): the in-memory list still works.
  }
}

/** Adds a scheme with status "saved". Returns the list unchanged if it is already tracked. */
export function trackScheme(scheme_id: string, scheme_name: string): TrackedApplication[] {
  const list = loadApplications();
  if (list.some((a) => a.scheme_id === scheme_id)) return list;
  const next: TrackedApplication[] = [
    ...list,
    {
      scheme_id,
      scheme_name,
      status: "saved",
      my_deadline: null,
      updated_at: new Date().toISOString(),
    },
  ];
  saveApplications(next);
  return next;
}

/** Changes the status of a tracked scheme. updated_at changes only if the status differs. */
export function setStatus(scheme_id: string, status: ApplicationStatus): TrackedApplication[] {
  const now = new Date().toISOString();
  const next = loadApplications().map((a) =>
    a.scheme_id === scheme_id && a.status !== status ? { ...a, status, updated_at: now } : a,
  );
  saveApplications(next);
  return next;
}

/** Sets or clears the student's deadline. An empty or invalid value clears it. */
export function setDeadline(scheme_id: string, value: string | null): TrackedApplication[] {
  const deadline = normalizeDeadline(value === "" ? null : value);
  const now = new Date().toISOString();
  const next = loadApplications().map((a) =>
    a.scheme_id === scheme_id && a.my_deadline !== deadline
      ? { ...a, my_deadline: deadline, updated_at: now }
      : a,
  );
  saveApplications(next);
  return next;
}

/** Removes a scheme from the tracked list. */
export function untrackScheme(scheme_id: string): TrackedApplication[] {
  const next = loadApplications().filter((a) => a.scheme_id !== scheme_id);
  saveApplications(next);
  return next;
}
