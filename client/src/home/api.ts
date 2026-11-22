import type {
  EvaluateRequest,
  EvaluateResponse,
  ExtractRequest,
  ExtractResponse,
  SchemeDetailResponse,
} from "../../../shared/contracts";
import type { ProfileAttributes } from "../../../shared/types";

/**
 * POST a JSON body to a relative /api path (the Vite dev proxy forwards it to the server).
 * The error message never includes the request body, so raw student text cannot leak through it.
 */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Sends the student's raw description for extraction. The text is never logged or stored here. */
export async function extract(text: string): Promise<ExtractResponse> {
  const body: ExtractRequest = { text };
  return postJson<ExtractResponse>("/api/extract", body);
}

/** Sends the student-corrected attributes for evaluation. */
export async function evaluate(attributes: ProfileAttributes): Promise<EvaluateResponse> {
  const body: EvaluateRequest = { attributes };
  return postJson<EvaluateResponse>("/api/evaluate", body);
}

/** Loads one scheme's detail (rules, documents, steps) by scheme id. */
export async function getScheme(id: string): Promise<SchemeDetailResponse> {
  const path = `/api/schemes/${encodeURIComponent(id)}`;
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as SchemeDetailResponse;
}
