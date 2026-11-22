import { useState } from "react";
import type { CSSProperties } from "react";
import type { DocumentItem } from "../../../shared/contracts";
import { theme } from "../theme/tokens";

interface ChecklistProps {
  schemeId: string;
  documents: DocumentItem[];
}

function storageKey(schemeId: string): string {
  return `haq.checklist.${schemeId}`;
}

/** Reads the saved checked indexes. Anything that is not a non-negative integer is dropped. */
function loadChecked(schemeId: string): number[] {
  try {
    const raw = window.localStorage.getItem(storageKey(schemeId));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0,
    );
    return Array.from(new Set(valid)).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** Stores only the checked indexes. Storage may be unavailable, so failures are ignored. */
function saveChecked(schemeId: string, indexes: number[]): void {
  try {
    window.localStorage.setItem(storageKey(schemeId), JSON.stringify(indexes));
  } catch {
    // Storage unavailable (e.g. private mode): keep the in-memory value only.
  }
}

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  minHeight: theme.minTapTargetPx,
  padding: "8px 0",
  fontSize: 16,
  cursor: "pointer",
};

const boxStyle: CSSProperties = {
  width: 24,
  height: 24,
  marginTop: 2,
  flexShrink: 0,
};

/** Tick list of documents. Only the checked document indexes are persisted per scheme. */
export default function Checklist({ schemeId, documents }: ChecklistProps) {
  const [checked, setChecked] = useState<number[]>(() => loadChecked(schemeId));

  function setIndex(index: number, isChecked: boolean) {
    const next = isChecked
      ? Array.from(new Set([...checked, index])).sort((a, b) => a - b)
      : checked.filter((current) => current !== index);
    setChecked(next);
    saveChecked(schemeId, next);
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
      {documents.map((doc, index) => (
        <li key={index}>
          <label style={itemStyle}>
            <input
              type="checkbox"
              style={boxStyle}
              checked={checked.includes(index)}
              onChange={(e) => setIndex(index, e.target.checked)}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{doc.name}</span>
              <span style={{ fontSize: 14 }}>{doc.tip}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
