import type { CSSProperties } from "react";
import { useState } from "react";
import type { ProfileAttributes } from "../../../shared/types";
import { en as t } from "../locales/en";
import { theme } from "../theme/tokens";
import { extract } from "./api";

interface HomeScreenProps {
  onExtracted: (attributes: ProfileAttributes) => void;
}

const EXAMPLES: { label: string; text: string }[] = [
  { label: t.exampleLabel1, text: t.exampleText1 },
  { label: t.exampleLabel2, text: t.exampleText2 },
  { label: t.exampleLabel3, text: t.exampleText3 },
];

const textareaStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 140,
  padding: 12,
  fontSize: 18,
  fontFamily: theme.font,
  color: theme.colors.text,
  border: `2px solid ${theme.colors.accent}`,
  borderRadius: 8,
};

const chipStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: theme.minTapTargetPx,
  padding: "10px 14px",
  fontSize: 16,
  fontFamily: theme.font,
  color: theme.colors.text,
  background: theme.colors.background,
  border: `2px dashed ${theme.colors.accent}`,
  borderRadius: 8,
  textAlign: "left",
  cursor: "pointer",
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

/**
 * Free-text entry. The raw text lives only in component state and is cleared
 * once the extract call returns, on success or failure. It is never stored.
 */
export default function HomeScreen({ onExtracted }: HomeScreenProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: string) {
    if (busy || input.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const response = await extract(input);
      onExtracted(response.attributes);
    } catch {
      setError(t.extractError);
    } finally {
      setText("");
      setBusy(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <textarea
        aria-label={t.homePlaceholder}
        placeholder={t.homePlaceholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        style={textareaStyle}
      />
      <p style={{ margin: 0, fontSize: 16 }}>{t.privacyLine}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{t.examplesHeading}</p>
        <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {EXAMPLES.map((example) => (
            <li key={example.label} style={{ listStyle: "none" }}>
              <button
                type="button"
                disabled={busy}
                style={chipStyle}
                onClick={() => {
                  setText(example.text);
                  void submit(example.text);
                }}
              >
                <span style={{ display: "block", fontWeight: 600 }}>{example.label}</span>
                <span style={{ display: "block", fontSize: 15 }}>{example.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, color: "#B91C1C" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || text.trim() === ""}
        style={primaryButtonStyle}
        onClick={() => void submit(text)}
      >
        {busy ? t.continueBusy : t.continueButton}
      </button>
    </section>
  );
}
