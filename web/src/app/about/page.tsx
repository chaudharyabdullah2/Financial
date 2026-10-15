"use client";

import { AlertTriangle, BookOpen, Braces, Server, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Reveal, StatusIndicator } from "@/components/ui/Display";
import { useHealth } from "@/lib/hooks";

const ENDPOINTS = [
  { method: "GET", path: "/api/health", desc: "Service and model status" },
  { method: "GET", path: "/api/model-info", desc: "Metadata, model comparison, per-class metrics, confusion matrix, mistakes" },
  { method: "GET", path: "/api/statistics", desc: "Dataset composition, length histogram, top terms per class" },
  { method: "GET", path: "/api/examples", desc: "Example sentences" },
  { method: "POST", path: "/api/predict", desc: "{ text, top_n }: label, probabilities, explanations" },
  { method: "POST", path: "/api/predict/batch", desc: "{ texts: string[] } (≤ 1,000): scored rows + summary" },
  { method: "POST", path: "/api/predict/file", desc: "multipart CSV (≤ 10 MB, 50k rows) + optional column" },
];

const LIMITS = [
  "Trained on ~5,300 English financial sentences (news and social posts). Other domains or languages will be less accurate.",
  "Bag-of-n-grams model: it sees which words and phrases appear, not deeper context, sarcasm or numbers' magnitude.",
  "Negative is the smallest class and has the lowest recall; some negative sentences are read as neutral.",
  "Confidence is calibrated on held-out folds, but it's still a model estimate, not a guarantee.",
];

export default function AboutPage() {
  const { health } = useHealth();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
      <div className="eyebrow mb-3">About</div>
      <h1 className="text-gradient text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">What Polarity is, and isn&apos;t.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Polarity is an academic prototype that classifies financial text as positive, neutral or negative. A Next.js interface talks to a FastAPI service, which runs the
        scikit-learn pipeline trained by <code className="font-mono text-[13px] text-fg">train.py</code>.
      </p>

      <div className="mt-10 space-y-5">
        <Reveal>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Architecture" title={<span className="flex items-center gap-2"><Server className="size-4 text-faint" />Request flow</span>} action={<StatusIndicator compact />} />
            <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs">
              {["Next.js UI", "/api proxy", "FastAPI", "sentiment_core.py", "scikit-learn pipeline"].map((s, i, a) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="rounded-lg border border-line-strong bg-white/[0.03] px-2.5 py-1.5 text-fg">{s}</span>
                  {i < a.length - 1 && <span className="text-faint">→</span>}
                </span>
              ))}
            </div>
            {health && (
              <p className="mt-4 text-xs text-faint">
                API v{health.api_version} · model {health.model ?? "not trained"} · up {Math.round(health.uptime_seconds / 60)} min
              </p>
            )}
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="REST API" title={<span className="flex items-center gap-2"><Braces className="size-4 text-faint" />Endpoints</span>} />
            <p className="mt-1 text-xs text-faint">
              Interactive docs at <code className="font-mono text-fg">http://localhost:8000/docs</code>.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <tbody>
                  {ENDPOINTS.map((e) => (
                    <tr key={e.path} className="border-t border-line/70 first:border-0">
                      <td className="w-16 py-2.5">
                        <span className={e.method === "GET" ? "font-mono text-[11px] text-series-1" : "font-mono text-[11px] text-series-3"}>{e.method}</span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-fg">{e.path}</td>
                      <td className="py-2.5 text-xs text-muted">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Methodology" title={<span className="flex items-center gap-2"><BookOpen className="size-4 text-faint" />How it was trained</span>} />
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
              <li>Text is cleaned (markup, URLs and whitespace removed; lower-cased) by one shared function used for both training and inference.</li>
              <li>514 duplicated sentences with conflicting negative/neutral labels were resolved to negative after manual inspection.</li>
              <li>Three model families were grid-searched with stratified 5-fold cross-validation, using balanced class weights.</li>
              <li>The model was selected by cross-validated macro F1. The 20% test split is used only for the numbers you see.</li>
            </ul>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-5 sm:p-6">
            <CardHeader eyebrow="Limitations" title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-faint" />Known limits</span>} />
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
              {LIMITS.map((l) => (
                <li key={l} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-white/[0.02] p-3 text-xs text-faint">
              <ShieldCheck className="size-4 shrink-0" /> Academic/testing prototype. Not financial advice.
            </p>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
