"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, FileText, Layers, ListChecks, Rows3, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/TermBars";
import { Button, type ButtonState } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchField, Segmented, Select, Slider, Toggle } from "@/components/ui/Controls";
import { AnimatedNumber, ErrorState, SentimentBadge } from "@/components/ui/Display";
import { Dropzone, FloatingTextArea, validateCsv, type FieldStatus } from "@/components/ui/Inputs";
import { api } from "@/lib/api";
import { SENTIMENTS, type BatchResponse, type FileResponse, type Sentiment } from "@/lib/types";
import { cn, downloadCsv, num, pct, SENTIMENT_META, SERIES } from "@/lib/utils";
import { ProcessingStages } from "./ProcessingStages";

const MAX_LINES = 1000;
const PAGE = 25;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Source = "file" | "paste";

export function BatchWorkspace() {
  const [source, setSource] = useState<Source>("file");
  const [file, setFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState<FieldStatus>({ kind: "idle" });
  const [pasted, setPasted] = useState("");
  const [pasteAttempted, setPasteAttempted] = useState(false);
  const [threshold, setThreshold] = useState(0.6);

  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<(BatchResponse & Partial<FileResponse>) | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const runId = useRef(0);

  const lines = pasted.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pasteStatus: FieldStatus = !pasted.trim()
    ? pasteAttempted
      ? { kind: "error", message: "Paste at least one sentence." }
      : { kind: "idle" }
    : lines.length > MAX_LINES
      ? { kind: "error", message: `${num(lines.length)} lines; the limit is ${num(MAX_LINES)}. Upload a CSV for larger batches.` }
      : { kind: "success", message: `${num(lines.length)} sentence${lines.length === 1 ? "" : "s"} detected` };

  async function execute(work: () => Promise<BatchResponse & Partial<FileResponse>>) {
    const id = ++runId.current;
    setRunning(true);
    setError(null);
    setButtonState("loading");
    const request = work();
    request.catch(() => undefined);
    for (let s = 0; s < 3; s++) {
      setStage(s);
      await sleep(220);
      if (id !== runId.current) return;
    }
    setStage(3);
    try {
      const r = await request;
      if (id !== runId.current) return;
      setStage(4);
      await sleep(380);
      setData(r);
      setButtonState("success");
      setTimeout(() => setButtonState("idle"), 1600);
      if (r.filename) setFileStatus({ kind: "success", message: `Scored ${num(r.summary.total)} rows from “${r.column}”${r.truncated ? ` (first ${num(r.summary.total)} of ${num(r.total_rows!)})` : ""}` });
    } catch (e) {
      if (id !== runId.current) return;
      setError((e as Error).message);
      setButtonState("idle");
      if (source === "file") setFileStatus({ kind: "error", message: (e as Error).message });
    } finally {
      if (id === runId.current) setRunning(false);
    }
  }

  function onFile(f: File) {
    const problem = validateCsv(f);
    setFile(f);
    setData(null);
    if (problem) {
      setFileStatus({ kind: "error", message: problem });
      return;
    }
    setFileStatus({ kind: "idle", message: "Uploading and scoring…" });
    execute(() => api.predictFile(f));
  }

  function submit() {
    if (source === "file") {
      if (!file) return setFileStatus({ kind: "error", message: "Choose a CSV file first." });
      if (validateCsv(file)) return;
      execute(() => api.predictFile(file, data?.column));
    } else {
      setPasteAttempted(true);
      if (pasteStatus.kind === "error" || !lines.length) return;
      execute(() => api.predictBatch(lines));
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <Card className="p-5 sm:p-6">
          <CardHeader
            eyebrow="Input"
            title="Score many sentences at once"
            action={
              <Segmented
                size="sm"
                layoutId="batch-source"
                value={source}
                onChange={(v) => {
                  setSource(v);
                  setError(null);
                }}
                options={[
                  { value: "file", label: <><Upload className="size-3.5" />CSV</> },
                  { value: "paste", label: <><FileText className="size-3.5" />Paste</> },
                ]}
              />
            }
          />
          <div className="mt-5">
            <AnimatePresence mode="wait" initial={false}>
              {source === "file" ? (
                <motion.div key="file" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <Dropzone
                    file={file}
                    onFile={onFile}
                    onClear={() => {
                      setFile(null);
                      setData(null);
                      setFileStatus({ kind: "idle" });
                    }}
                    status={fileStatus}
                  />
                  {data?.columns && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <Select
                        label="Text column"
                        description="Detected automatically. Pick another column to re-score."
                        value={data.column!}
                        onChange={(c) => file && execute(() => api.predictFile(file, c))}
                        options={data.columns.map((c) => ({ value: c, label: c }))}
                      />
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="paste" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  <FloatingTextArea
                    label="One sentence per line"
                    value={pasted}
                    onChange={setPasted}
                    maxLength={200_000}
                    rows={8}
                    status={pasteStatus}
                    helper={`Up to ${num(MAX_LINES)} lines. Empty lines are ignored.`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button size="lg" onClick={submit} state={buttonState} loadingText="Scoring…" successText="Scored" icon={<Layers className="size-4" />}>
              {source === "file" && data ? "Re-score file" : "Score batch"}
            </Button>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader eyebrow="Controls" title="Review settings" />
          <div className="mt-5 space-y-6">
            <Slider
              label="Uncertainty threshold"
              description="Rows with confidence below this are flagged for manual review."
              value={threshold}
              min={0.4}
              max={0.9}
              step={0.05}
              onChange={setThreshold}
              format={(v) => pct(v)}
            />
            <AnimatePresence mode="wait">
              {running ? (
                <motion.div key="stages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProcessingStages stage={stage} />
                </motion.div>
              ) : error && source === "paste" ? (
                <ErrorState key="err" message={error} onRetry={submit} />
              ) : data ? (
                <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <SummaryTiles data={data} threshold={threshold} />
                </motion.div>
              ) : (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-dashed border-line p-5 text-sm text-faint">
                  <ListChecks className="mb-2 size-5 text-accent-soft" />
                  Results summary appears here: class mix, average confidence and how many rows need review.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <AnimatePresence>{data && !running && <BatchResults key={data.latency_ms} data={data} threshold={threshold} />}</AnimatePresence>
    </div>
  );
}

function SummaryTiles({ data, threshold }: { data: BatchResponse; threshold: number }) {
  const { summary, results } = data;
  const uncertain = results.filter((r) => r.confidence < threshold).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Rows scored" value={summary.total} fmt={(v) => num(Math.round(v))} />
        <Tile label="Avg confidence" value={summary.mean_confidence * 100} fmt={(v) => `${v.toFixed(0)}%`} />
        <Tile label="Need review" value={uncertain} fmt={(v) => num(Math.round(v))} tone={uncertain ? "text-amber-200" : undefined} />
      </div>
      <div>
        <div className="eyebrow mb-2.5">Class mix</div>
        <div className="flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
          {SENTIMENTS.map((s) =>
            summary.counts[s] ? (
              <motion.div
                key={s}
                title={`${SENTIMENT_META[s].label}: ${num(summary.counts[s])}`}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: summary.counts[s] }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: SENTIMENT_META[s].color, flexBasis: 0 }}
              />
            ) : null,
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-2">
          {SENTIMENTS.map((s) => (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="size-2.5 rounded-[3px]" style={{ background: SENTIMENT_META[s].color }} />
              <span className="text-muted">{SENTIMENT_META[s].label}</span>
              <span className="ml-auto font-mono tabular-nums text-fg">{pct(summary.counts[s] / Math.max(1, summary.total))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, fmt, tone }: { label: string; value: number; fmt: (v: number) => string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3">
      <div className={cn("text-2xl font-semibold tracking-tight", tone)}>
        <AnimatedNumber value={value} format={fmt} />
      </div>
      <div className="mt-0.5 text-[11px] text-faint">{label}</div>
    </div>
  );
}

function BatchResults({ data, threshold }: { data: BatchResponse & Partial<FileResponse>; threshold: number }) {
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState<Set<Sentiment>>(new Set(SENTIMENTS));
  const [onlyUncertain, setOnlyUncertain] = useState(false);
  const [page, setPage] = useState(0);
  const [exportState, setExportState] = useState<ButtonState>("idle");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.results
      .map((r, i) => ({ ...r, row: i + 1 }))
      .filter((r) => classes.has(r.prediction) && (!onlyUncertain || r.confidence < threshold) && (!q || r.text.toLowerCase().includes(q)));
  }, [data.results, query, classes, onlyUncertain, threshold]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE, current * PAGE + PAGE);

  const histogram = useMemo(() => {
    const bins = Array.from({ length: 7 }, (_, i) => ({ bucket: `${30 + i * 10}–${40 + i * 10}%`, rows: 0 }));
    for (const r of data.results) bins[Math.min(6, Math.max(0, Math.floor(r.confidence * 10) - 3))].rows++;
    return bins;
  }, [data.results]);

  function toggleClass(s: Sentiment) {
    setPage(0);
    setClasses((prev) => {
      const next = new Set(prev);
      if (next.has(s) && next.size > 1) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <CardHeader
          eyebrow="Results"
          title={
            <span className="flex items-center gap-2">
              <Rows3 className="size-4 text-faint" /> {num(filtered.length)} of {num(data.results.length)} rows
            </span>
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              state={exportState}
              successText="Exported"
              icon={<Download className="size-3.5" />}
              onClick={() => {
                downloadCsv(filtered, `polarity_${(data.filename ?? "batch").replace(/\.csv$/i, "")}_scored.csv`);
                setExportState("success");
                setTimeout(() => setExportState("idle"), 1500);
              }}
            >
              Export CSV
            </Button>
          }
        />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchField value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="Search text…" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by class">
            {SENTIMENTS.map((s) => {
              const on = classes.has(s);
              return (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.94 }}
                  aria-pressed={on}
                  onClick={() => toggleClass(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on ? "border-line-strong bg-white/[0.06] text-fg" : "border-line text-faint line-through decoration-faint/60",
                  )}
                >
                  <span className="size-2 rounded-full" style={{ background: SENTIMENT_META[s].color, opacity: on ? 1 : 0.35 }} />
                  {SENTIMENT_META[s].label}
                  <span className="font-mono text-[10px] text-faint">{num(data.summary.counts[s])}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <Toggle label="Only rows needing review" description={`Confidence below ${pct(threshold)}`} checked={onlyUncertain} onChange={(v) => { setOnlyUncertain(v); setPage(0); }} />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] table-fixed text-sm">
            <thead>
              <tr className="border-b border-line bg-white/[0.02] text-left text-[11px] uppercase tracking-wider text-faint">
                <th className="w-14 px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Text</th>
                <th className="w-32 px-3 py-2.5 font-medium">Label</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <motion.tr
                  key={`${current}-${r.row}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.012 }}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-faint">{r.row}</td>
                  <td className="max-w-0 px-3 py-2.5">
                    <div className="truncate text-muted" title={r.text}>{r.text || <span className="italic text-faint">(empty)</span>}</div>
                  </td>
                  <td className="px-3 py-2.5"><SentimentBadge label={r.prediction} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("font-mono text-xs tabular-nums", r.confidence < threshold ? "text-amber-200" : "text-muted")}>
                      {r.confidence < threshold && "⚑ "}
                      {pct(r.confidence, 1)}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-faint">No rows match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-faint">
          <span>Page {current + 1} of {pages}</span>
          <div className="flex gap-1">
            <button disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-lg border border-line p-1.5 transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
            <button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-lg border border-line p-1.5 transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30" aria-label="Next page"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader eyebrow="Distribution" title="Confidence across rows" />
        <p className="mt-1 text-xs text-faint">How sure the model was. Lower buckets deserve a human look.</p>
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bucket" tick={{ fill: "#5f6677", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} interval={0} angle={-30} textAnchor="end" height={44} />
              <YAxis tick={{ fill: "#5f6677", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip format={(v) => `${num(v)} rows`} />} />
              <Bar dataKey="rows" name="Rows" fill={SERIES[0]} radius={[4, 4, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {data.truncated && <p className="mt-3 text-xs text-amber-200/90">Only the first {num(data.summary.total)} of {num(data.total_rows!)} rows were scored.</p>}
        <p className="mt-3 font-mono text-[11px] text-faint">Scored in {data.latency_ms.toFixed(0)} ms</p>
      </Card>
    </motion.div>
  );
}
