"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, Database, Filter, GitCompare, Grid3x3, Layers3, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, Legend, TermBars } from "@/components/charts/TermBars";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchField, Segmented, Skeleton } from "@/components/ui/Controls";
import { AnimatedNumber, ErrorState, Reveal, SentimentBadge } from "@/components/ui/Display";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { SENTIMENTS, type ModelInfo, type Sentiment, type Statistics } from "@/lib/types";
import { cn, humanizeParam, num, pct, relativeTime, SENTIMENT_META, SERIES } from "@/lib/utils";

const axis = { tick: { fill: "#5f6677", fontSize: 11 }, tickLine: false };

export default function AnalyticsPage() {
  const info = useApi(api.modelInfo);
  const stats = useApi(api.statistics);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
      <div className="mb-10">
        <div className="eyebrow mb-3">Model analytics</div>
        <h1 className="text-gradient text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">How good is the model, really?</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Every number below comes from the latest <code className="font-mono text-[13px] text-fg">train.py</code> run, measured on a held-out test set the model never saw
          during selection.
        </p>
      </div>

      {info.error ? (
        <ErrorState message={info.error} onRetry={info.retry} />
      ) : (
        <div className="space-y-5">
          <Kpis info={info.data} />
          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <ComparisonCard info={info.data} />
            <ConfusionCard info={info.data} />
          </div>
          <PerClassCard info={info.data} />
          {stats.error ? <ErrorState message={stats.error} onRetry={stats.retry} /> : <DatasetSection stats={stats.data} />}
          <MistakesCard info={info.data} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- KPIs */

function Kpis({ info }: { info: ModelInfo | null }) {
  const m = info?.metadata;
  const tiles = m
    ? [
        {
          icon: Trophy,
          label: "Selected model",
          text: m.best_model.replace(/\s*\(.*\)$/, ""),
          sub: [m.best_model.match(/\((.*)\)/)?.[1], ...Object.entries(m.best_params).map(([k, v]) => `${humanizeParam(k)}=${v}`)].filter(Boolean).join(" · "),
        },
        { icon: Target, label: "Test macro F1", value: m.test_macro_f1 * 100, sub: `CV ${pct(m.cv_macro_f1, 1)} (selection metric)` },
        { icon: Grid3x3, label: "Test accuracy", value: m.test_accuracy * 100, sub: `${num(m.test_size)} held-out sentences` },
        { icon: CalendarClock, label: "Trained", text: relativeTime(m.trained_at), sub: `${m.cv_folds}-fold CV · seed ${m.seed}` },
      ]
    : null;
  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      {(tiles ?? Array.from({ length: 4 })).map((t, i) => (
        <Reveal key={i} delay={i * 0.05}>
          <Card tilt={4} className="h-full p-5">
            {t ? (
              <>
                <div className="flex items-center gap-2 text-xs text-faint">
                  <t.icon className="size-3.5" /> {t.label}
                </div>
                <div className="mt-3 truncate text-2xl font-semibold tracking-tight sm:text-3xl" title={t.text}>
                  {"value" in t && t.value !== undefined ? <AnimatedNumber value={t.value} format={(v) => `${v.toFixed(1)}%`} /> : t.text}
                </div>
                <div className="mt-1.5 truncate text-xs text-faint" title={t.sub}>{t.sub}</div>
              </>
            ) : (
              <>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-28" />
              </>
            )}
          </Card>
        </Reveal>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- Model comparison */

const COMPARISON_SERIES = [
  { key: "cv_macro_f1", label: "CV macro F1", color: SERIES[0] },
  { key: "test_macro_f1", label: "Test macro F1", color: SERIES[1] },
  { key: "test_accuracy", label: "Test accuracy", color: SERIES[2] },
] as const;

function ComparisonCard({ info }: { info: ModelInfo | null }) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader eyebrow="Model selection" title={<span className="flex items-center gap-2"><GitCompare className="size-4 text-faint" />Candidates compared</span>} />
      <p className="mt-1 text-xs text-faint">The winner is chosen by cross-validated macro F1 on training data only.</p>
      <div className="mt-4">
        <Legend items={COMPARISON_SERIES.map((s) => ({ label: s.label, color: s.color }))} />
      </div>
      <div className="mt-3 h-64">
        {info ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={info.comparison} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="model" {...axis} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickFormatter={(v: string) => v.replace(" (calibrated)", "")} />
              <YAxis {...axis} axisLine={false} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip format={(v) => pct(v, 1)} />} />
              {COMPARISON_SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} animationDuration={900} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
      {info && (
        <div className="mt-4 space-y-1.5">
          {info.comparison.map((r, i) => (
            <div key={r.model} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-muted">
                {i === 0 && <Trophy className="size-3 text-amber-200" />}
                <span className={i === 0 ? "text-fg" : undefined}>{r.model}</span>
              </span>
              <span className="font-mono text-faint">
                {Object.entries(r.best_params).map(([k, v]) => `${humanizeParam(k)}=${v}`).join(" ")} · ±{(r.cv_macro_f1_std * 100).toFixed(1)} · {r.train_seconds}s
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- Confusion matrix */

function ConfusionCard({ info }: { info: ModelInfo | null }) {
  const [mode, setMode] = useState<"normalized" | "counts">("normalized");
  const [hover, setHover] = useState<[number, number] | null>(null);
  const cm = info?.confusion_matrix;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        eyebrow="Errors"
        title="Confusion matrix"
        action={
          <Segmented size="sm" layoutId="cm-mode" value={mode} onChange={setMode} options={[{ value: "normalized", label: "Recall %" }, { value: "counts", label: "Counts" }]} />
        }
      />
      <p className="mt-1 text-xs text-faint">Rows are the true label, columns the prediction. The diagonal is correct.</p>
      {!cm ? (
        info ? <p className="mt-6 text-sm text-faint">Re-run train.py to generate matrix data.</p> : <Skeleton className="mt-6 h-64 w-full" />
      ) : (
        <div className="mt-6">
          <div className="grid grid-cols-[72px_repeat(3,1fr)] gap-[2px]">
            <div />
            {cm.labels.map((l) => (
              <div key={l} className="pb-2 text-center text-[11px] text-faint">pred. {SENTIMENT_META[l].label.toLowerCase()}</div>
            ))}
            {cm.labels.map((actual, i) => (
              <Row key={actual}>
                <div className="flex items-center text-[11px] text-faint">{SENTIMENT_META[actual].label}</div>
                {cm.labels.map((pred, j) => {
                  const norm = cm.normalized[i][j];
                  const count = cm.counts[i][j];
                  const isHover = hover?.[0] === i && hover?.[1] === j;
                  return (
                    <motion.div
                      key={pred}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i * 3 + j) * 0.04, duration: 0.4 }}
                      onMouseEnter={() => setHover([i, j])}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "relative grid aspect-[1.35] place-items-center rounded-[4px] transition-shadow",
                        i === j && "ring-1 ring-inset ring-white/15",
                        isHover && "shadow-[0_0_0_2px_#0c0e13,0_0_0_3px_rgba(255,255,255,0.5)]",
                      )}
                      // Sequential single hue: near-zero recedes to the surface.
                      style={{ background: `rgba(57,135,229,${0.06 + norm * 0.84})` }}
                    >
                      <span className={cn("font-mono text-sm tabular-nums", norm > 0.45 ? "text-white" : "text-muted")}>
                        {mode === "normalized" ? pct(norm) : num(count)}
                      </span>
                    </motion.div>
                  );
                })}
              </Row>
            ))}
          </div>
          <div className="mt-4 min-h-[20px] text-xs text-muted">
            {hover ? (
              <>
                True <b className="font-medium text-fg">{cm.labels[hover[0]]}</b> predicted as <b className="font-medium text-fg">{cm.labels[hover[1]]}</b>:{" "}
                {num(cm.counts[hover[0]][hover[1]])} sentences ({pct(cm.normalized[hover[0]][hover[1]], 1)} of that class)
              </>
            ) : (
              <span className="text-faint">Hover a cell for details.</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* ------------------------------------------------------ Per-class metrics */

const PER_CLASS_SERIES = [
  { key: "precision", label: "Precision", color: SERIES[0] },
  { key: "recall", label: "Recall", color: SERIES[1] },
  { key: "f1", label: "F1", color: SERIES[2] },
] as const;

function PerClassCard({ info }: { info: ModelInfo | null }) {
  const data = info?.per_class.map((c) => ({ ...c, name: SENTIMENT_META[c.label].label }));
  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <CardHeader eyebrow="Per class" title={<span className="flex items-center gap-2"><Layers3 className="size-4 text-faint" />Where the model is strong and weak</span>} />
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Negative is the smallest class, so it has the lowest recall: some negative sentences are read as neutral. Macro F1 weights all three classes equally, which is
            why it&apos;s the selection metric.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-faint">
                  <th className="py-2 font-medium">Class</th>
                  <th className="py-2 text-right font-medium">Prec.</th>
                  <th className="py-2 text-right font-medium">Recall</th>
                  <th className="py-2 text-right font-medium">F1</th>
                  <th className="py-2 text-right font-medium">n</th>
                </tr>
              </thead>
              <tbody>
                {info?.per_class.map((c) => (
                  <tr key={c.label} className="border-t border-line/70">
                    <td className="py-2.5"><SentimentBadge label={c.label} /></td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-muted">{pct(c.precision, 1)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-muted">{pct(c.recall, 1)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-fg">{pct(c.f1, 1)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-faint">{num(c.support)}</td>
                  </tr>
                )) ?? (
                  <tr>
                    <td colSpan={5}><Skeleton className="mt-2 h-24 w-full" /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Legend items={PER_CLASS_SERIES.map((s) => ({ label: s.label, color: s.color }))} />
          <div className="mt-3 h-64">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barGap={2} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" {...axis} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                  <YAxis {...axis} axisLine={false} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip format={(v) => pct(v, 1)} />} />
                  {PER_CLASS_SERIES.map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} animationDuration={900} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- Dataset */

function DatasetSection({ stats }: { stats: Statistics | null }) {
  const [termClass, setTermClass] = useState<Sentiment>("negative");
  const d = stats?.dataset;
  const flow = d
    ? [
        { label: "Raw rows", value: d.raw_rows },
        { label: "Valid rows", value: d.valid_rows },
        { label: "Label conflicts resolved", value: d.conflicts_resolved },
        { label: "Unique sentences", value: d.final_rows },
      ]
    : null;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card className="p-5 sm:p-6">
          <CardHeader eyebrow="Training data" title={<span className="flex items-center gap-2"><Database className="size-4 text-faint" />Dataset composition</span>} />
          {d ? (
            <>
              <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
                {SENTIMENTS.map((s) => (
                  <motion.div
                    key={s}
                    title={`${SENTIMENT_META[s].label}: ${num(d.class_counts[s])}`}
                    initial={{ flexGrow: 0 }}
                    whileInView={{ flexGrow: d.class_counts[s] }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: SENTIMENT_META[s].color, flexBasis: 0 }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SENTIMENTS.map((s) => (
                  <div key={s}>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="size-2.5 rounded-[3px]" style={{ background: SENTIMENT_META[s].color }} />
                      {SENTIMENT_META[s].label}
                    </div>
                    <div className="mt-1 font-mono text-sm tabular-nums">
                      {num(d.class_counts[s])} <span className="text-faint">· {pct(d.class_counts[s] / d.final_rows)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {flow!.map((f, i) => (
                  <div key={f.label} className="flex items-center gap-3 text-sm">
                    <span className="grid size-6 place-items-center rounded-md bg-white/[0.04] font-mono text-[10px] text-faint">{i + 1}</span>
                    <span className="flex-1 text-muted">{f.label}</span>
                    <span className="font-mono tabular-nums">{num(f.value)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-white/[0.02] p-3 text-xs leading-relaxed text-faint">
                <Filter className="mt-px size-3.5 shrink-0" />
                {num(d.conflicts_resolved)} sentences appeared twice, labelled negative and neutral. They read clearly negative, so they were resolved to the non-neutral label.
              </p>
            </>
          ) : (
            <Skeleton className="mt-5 h-60 w-full" />
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader eyebrow="Text length" title="Sentence length by class" />
          <p className="mt-1 text-xs text-faint">
            {stats ? `Median ${stats.median_words.toFixed(0)} words · mean ${stats.avg_words.toFixed(1)}` : " "}
          </p>
          <div className="mt-4">
            <Legend items={SENTIMENTS.map((s) => ({ label: SENTIMENT_META[s].label, color: SENTIMENT_META[s].color }))} />
          </div>
          <div className="mt-3 h-64">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.length_histogram} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap={3}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="bucket" {...axis} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tick={{ fill: "#5f6677", fontSize: 10 }} />
                  <YAxis {...axis} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip format={(v) => `${num(v)} sentences`} />} labelFormatter={(l) => `${l} words`} />
                  {SENTIMENTS.map((s, i) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      stackId="len"
                      name={SENTIMENT_META[s].label}
                      fill={SENTIMENT_META[s].color}
                      stroke="#0c0e13"
                      strokeWidth={2}
                      radius={i === SENTIMENTS.length - 1 ? [4, 4, 0, 0] : 0}
                      animationDuration={900}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          eyebrow="Vocabulary"
          title="Strongest signals the model learned"
          action={
            <Segmented size="sm" layoutId="terms-class" value={termClass} onChange={setTermClass} options={SENTIMENTS.map((s) => ({ value: s, label: SENTIMENT_META[s].label }))} />
          }
        />
        <p className="mt-1 text-xs text-faint">Word and phrase features with the largest weight toward each class (character n-grams omitted).</p>
        <div className="mt-5">
          {stats ? (
            <motion.div key={termClass} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-x-10 md:grid-cols-2">
              <TermBars terms={stats.top_terms[termClass].slice(0, 8)} color={SENTIMENT_META[termClass].color} />
              <TermBars terms={stats.top_terms[termClass].slice(8, 15)} color={SENTIMENT_META[termClass].color} />
            </motion.div>
          ) : (
            <Skeleton className="h-60 w-full" />
          )}
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------- Mistakes */

function MistakesCard({ info }: { info: ModelInfo | null }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (info?.misclassified ?? []).filter((r) => !q || r.text.toLowerCase().includes(q));
  }, [info, query]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <CardHeader eyebrow="Error analysis" title="Most confident mistakes" />
        <div className="sm:w-72">
          <SearchField value={query} onChange={setQuery} placeholder="Search mistakes…" />
        </div>
      </div>
      <p className="mt-1 text-xs text-faint">Test sentences the model got wrong while being sure. Many are borderline or arguably mislabelled.</p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-line bg-white/[0.02] text-left text-[11px] uppercase tracking-wider text-faint">
              <th className="px-3 py-2.5 font-medium">Text</th>
              <th className="w-56 px-3 py-2.5 font-medium">True → predicted</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {!info &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={3} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))}
            {rows.slice(0, 20).map((r, i) => (
              <tr key={i} className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.03]">
                <td className="max-w-0 px-3 py-2.5">
                  <div className="truncate text-muted" title={r.text}>{r.text}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <SentimentBadge label={r.true} />
                    <ArrowRight className="size-3 text-faint" />
                    <SentimentBadge label={r.predicted} />
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted">{pct(r.confidence, 1)}</td>
              </tr>
            ))}
            {info && !rows.length && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-faint">No matches.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
