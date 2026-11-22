import { useState } from "react";
import type { CSSProperties } from "react";
import type { EvaluateResponse } from "../../shared/contracts";
import type { ProfileAttributes, ProfileCategory } from "../../shared/types";
import HomeScreen from "./home/HomeScreen";
import ProfileReview from "./home/ProfileReview";
import { evaluate } from "./home/api";
import ResultsScreen from "./results/ResultsScreen";
import SchemeDetail from "./scheme/SchemeDetail";
import ReminderBanner from "./tracker/ReminderBanner";
import TrackerScreen from "./tracker/TrackerScreen";
import {
  loadApplications,
  setDeadline,
  setStatus,
  trackScheme,
  untrackScheme,
} from "./tracker/storage";
import type { TrackedApplication } from "./tracker/storage";
import { en as t } from "./locales/en";
import { theme } from "./theme/tokens";

type Screen = "home" | "review" | "results" | "scheme" | "tracker";

const PROFILE_KEY = "haq.profile";
const CATEGORIES: string[] = ["OC", "BC", "SC", "ST", "MINORITY", "EBC"];

/** Keeps only well-typed attribute values from untrusted stored JSON. */
function toProfile(value: unknown): ProfileAttributes {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const stored = value as Record<string, unknown>;
  const profile: ProfileAttributes = {};
  if (typeof stored.category === "string" && CATEGORIES.includes(stored.category)) {
    profile.category = stored.category as ProfileCategory;
  }
  if (typeof stored.annual_income === "number" && Number.isFinite(stored.annual_income)) {
    profile.annual_income = stored.annual_income;
  }
  if (stored.area === "rural" || stored.area === "urban") profile.area = stored.area;
  if (typeof stored.course_level === "string") profile.course_level = stored.course_level;
  if (typeof stored.year_of_study === "number" && Number.isFinite(stored.year_of_study)) {
    profile.year_of_study = stored.year_of_study;
  }
  if (typeof stored.age === "number" && Number.isFinite(stored.age)) profile.age = stored.age;
  return profile;
}

/** Reads the saved attributes on mount. Returns an empty profile if storage is missing or invalid. */
function loadProfile(): ProfileAttributes {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw === null) return {};
    return toProfile(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Top navigation button. Active one gets a filled background. Tap target is at least theme.minTapTargetPx. */
function navButtonStyle(active: boolean): CSSProperties {
  return {
    minHeight: theme.minTapTargetPx,
    padding: "8px 12px",
    fontSize: 15,
    fontFamily: theme.font,
    color: active ? theme.colors.background : theme.colors.accent,
    background: active ? theme.colors.accent : theme.colors.background,
    border: `2px solid ${theme.colors.accent}`,
    borderRadius: 8,
    cursor: "pointer",
  };
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  boxSizing: "border-box",
  fontFamily: theme.font,
  color: theme.colors.text,
  background: theme.colors.background,
};

const containerStyle: CSSProperties = {
  maxWidth: theme.maxWidthPx,
  margin: "0 auto",
  padding: 16,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [attributes, setAttributes] = useState<ProfileAttributes>(loadProfile);
  const [results, setResults] = useState<EvaluateResponse | null>(null);
  const [reviewError, setReviewError] = useState<string | undefined>(undefined);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedApplication[]>(loadApplications);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Only attributes are persisted. Raw student text never reaches storage.
  function updateAttributes(next: ProfileAttributes) {
    setAttributes(next);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (e.g. private mode): keep the in-memory value only.
    }
  }

  function handleExtracted(next: ProfileAttributes) {
    updateAttributes(next);
    setResults(null);
    setReviewError(undefined);
    setScreen("review");
  }

  async function handleSeeScholarships() {
    setReviewError(undefined);
    try {
      const response = await evaluate(attributes);
      setResults(response);
      setScreen("results");
    } catch {
      setReviewError(t.reviewError);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            aria-current={screen !== "tracker" ? "page" : undefined}
            style={navButtonStyle(screen !== "tracker")}
            onClick={() => setScreen(results !== null ? "results" : "home")}
          >
            {t.navFindScholarships}
          </button>
          <button
            type="button"
            aria-current={screen === "tracker" ? "page" : undefined}
            style={navButtonStyle(screen === "tracker")}
            onClick={() => setScreen("tracker")}
          >
            {`${t.navMyApplications} (${tracked.length})`}
          </button>
        </nav>

        <header>
          <h1 style={{ margin: 0, fontSize: 26, color: theme.colors.accent }}>{t.appName}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 15 }}>{t.tagline}</p>
        </header>

        <ReminderBanner
          applications={tracked}
          dismissed={bannerDismissed}
          onDismiss={() => setBannerDismissed(true)}
          onOpen={() => setScreen("tracker")}
        />

        {screen === "home" && <HomeScreen onExtracted={handleExtracted} />}

        {screen === "review" && (
          <ProfileReview
            attributes={attributes}
            onChange={updateAttributes}
            onSeeScholarships={() => void handleSeeScholarships()}
            followUpQuestions={results?.follow_up_questions ?? []}
            error={reviewError}
          />
        )}

        {screen === "results" && results !== null && (
          <ResultsScreen
            response={results}
            onChangeDetails={() => setScreen("review")}
            onViewDetails={(id) => {
              setSelectedSchemeId(id);
              setScreen("scheme");
            }}
          />
        )}

        {screen === "scheme" && selectedSchemeId !== null && (
          <SchemeDetail
            schemeId={selectedSchemeId}
            onBack={() => setScreen("results")}
            onTrack={(id, name) => setTracked(trackScheme(id, name))}
            onOpenTracker={() => setScreen("tracker")}
            trackedStatus={tracked.find((a) => a.scheme_id === selectedSchemeId)?.status ?? null}
          />
        )}

        {screen === "tracker" && (
          <TrackerScreen
            applications={tracked}
            onStatusChange={(id, status) => setTracked(setStatus(id, status))}
            onDeadlineChange={(id, value) => setTracked(setDeadline(id, value))}
            onUntrack={(id) => setTracked(untrackScheme(id))}
          />
        )}
      </div>
    </div>
  );
}
