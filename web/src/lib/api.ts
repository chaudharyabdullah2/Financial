import type {
  BatchResponse,
  Example,
  FileResponse,
  Health,
  ModelInfo,
  Prediction,
  Statistics,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// FastAPI returns {detail: string} for HTTPException and {detail: [{msg}]} for
// validation errors; normalise both into one readable message.
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, "")).join(" ");
  } catch {
    /* non-JSON error body */
  }
  if (res.status >= 500) return "The analysis service is unavailable. Is the FastAPI server running on port 8000?";
  return `Request failed (${res.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("Cannot reach the analysis service. Check that the API server is running.", 0);
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  health: () => request<Health>("/api/health", { cache: "no-store" }),
  modelInfo: () => request<ModelInfo>("/api/model-info"),
  statistics: () => request<Statistics>("/api/statistics"),
  examples: () => request<Example[]>("/api/examples"),
  predict: (text: string, topN = 8) => request<Prediction>("/api/predict", json({ text, top_n: topN })),
  predictBatch: (texts: string[]) => request<BatchResponse>("/api/predict/batch", json({ texts })),
  predictFile: (file: File, column?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (column) form.append("column", column);
    return request<FileResponse>("/api/predict/file", { method: "POST", body: form });
  },
};
