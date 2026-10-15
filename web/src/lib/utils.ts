import { clsx, type ClassValue } from "clsx";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { BatchRow, Sentiment } from "./types";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const SENTIMENT_META: Record<Sentiment, { label: string; color: string; text: string; bg: string; ring: string; icon: LucideIcon; blurb: string }> = {
  positive: {
    label: "Positive",
    color: "#2b9fc4",
    text: "text-pos-soft",
    bg: "bg-pos/12",
    ring: "ring-pos/35",
    icon: TrendingUp,
    blurb: "Language signals improving fundamentals or optimism.",
  },
  negative: {
    label: "Negative",
    color: "#e5576f",
    text: "text-neg-soft",
    bg: "bg-neg/12",
    ring: "ring-neg/35",
    icon: TrendingDown,
    blurb: "Language signals deterioration, risk or pessimism.",
  },
  neutral: {
    label: "Neutral",
    color: "#7a8294",
    text: "text-neu-soft",
    bg: "bg-neu/15",
    ring: "ring-neu/35",
    icon: Minus,
    blurb: "Factual or balanced language without a clear direction.",
  },
};

export const SERIES = ["#3987e5", "#d95926", "#199e70"] as const;

export const pct =(v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const num = (v: number) => new Intl.NumberFormat("en-US").format(v);

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "unknown";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export const humanizeParam = (key: string) => key.replace(/^model__(estimator__)?/, "");

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(rows: BatchRow[], filename: string) {
  const header = ["text", "prediction", "confidence", "p_negative", "p_neutral", "p_positive"];
  const lines = rows.map((r) =>
    [r.text, r.prediction, r.confidence.toFixed(4), r.probabilities.negative.toFixed(4), r.probabilities.neutral.toFixed(4), r.probabilities.positive.toFixed(4)]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
