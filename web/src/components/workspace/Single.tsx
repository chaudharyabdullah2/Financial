"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Clock, Cpu, History, Info, Sparkles, Trash2, Wand2, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TermBars } from "@/components/charts/TermBars";
import { Button, type ButtonState } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented, Slider, Toggle } from "@/components/ui/Controls";
import { ConfidenceRing, ErrorState, SentimentBadge, Skeleton } from "@/components/ui/Display";
import { FloatingTextArea, type FieldStatus } from "@/components/ui/Inputs";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { SENTIMENTS, type Prediction, type Sentiment } from "@/lib/types";
import { cn, pct, relativeTime, SENTIMENT_META } from "@/lib/utils";
import { ProcessingStages } from "./ProcessingStages";

const MAX_CHARS = 5000;
const HISTORY_KEY = "polarity.history.v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type HistoryItem = { id: number; text: string; prediction: Sentiment; confidence: number; at: string };

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: history stays in memory only */
  }
}

function validate(text: string, attempted: boolean): FieldStatus {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!text.trim()) return attempted ? { kind: "error", message: "Enter some financial text to analyze." } : { kind: "idle" };
  if (words < 3) return { kind: "warning", message: "Very short inputs are less reliable; add a little context if you can." };
  return { kind: "success", message: `${words} words · ready to analyze` };
}

export function SingleWorkspace() {
  const [text, setText] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [topN, setTopN] = useState(8);
  const [showAll, setShowAll] = useState(false);
  const [live, setLive] = useState(false);

  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [animated, setAnimated] = useState(true);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Prediction | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const runId = useRef(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const examples = useApi(api.examples);

  useEffect(() => setHistory(loadHistory()), []);

  const status = validate(text, attempted);

  const run = useCallback(
    async (input: string, withStages: boolean) => {
      if (!input.trim()) {
        setAttempted(true);
        textarea.current?.focus();
        return;
      }
      const id = ++runId.current;
      setAnimated(withStages);
      setPhase("running");
      setError(null);
      if (withStages) setButtonState("loading");
      const request = api.predict(input, topN);
      request.catch(() => undefined); // handled below; avoids an unhandled rejection while stages animate

      // Visual pipeline: early stages advance on a short timer; "Generating
      // result" holds until the API has actually answered.
      if (withStages) {
        for (let s = 0; s < 3; s++) {
          setStage(s);
          await sleep(260);
          if (id !== runId.current) return;
        }
        setStage(3);
      }
      try {
        const r = await request;
        if (id !== runId.current) return;
        if (withStages) {
          await sleep(200);
          setStage(4);
          await sleep(420);
          if (id !== runId.current) return;
        }
        setResult(r);
        setAnalyzedText(input);
        setPhase("done");
        if (withStages) {
          setButtonState("success");
          setTimeout(() => setButtonState("idle"), 1600);
        }
        setHistory((h) => {
          const next = [
            { id: Date.now(), text: input, prediction: r.prediction, confidence: r.confidence, at: new Date().toISOString() },
            ...h.filter((x) => x.text !== input),
          ].slice(0, 8);
          saveHistory(next);
          return next;
        });
      } catch (e) {
        if (id !== runId.current) return;
        setError((e as Error).message);
        setPhase("error");
        setButtonState("idle");
      }
    },
    [topN],
  );

  // Live mode: re-analyze shortly after typing stops, without the stage animation.
  useEffect(() => {
    if (!live || text.trim().split(/\s+/).filter(Boolean).length < 2) return;
    const id = setTimeout(() => run(text, false), 550);
    return () => clearTimeout(id);
  }, [text, live, run]);

  // Changing explanation depth refreshes the current result in place.
  const lastTopN = useRef(topN);
  useEffect(() => {
    if (lastTopN.current === topN) return;
    lastTopN.current = topN;
    if (!analyzedText) return;
    const id = setTimeout(() => run(analyzedText, false), 250);
    return () => clearTimeout(id);
  }, [topN, analyzedText, run]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      {/* ------------------------------------------------ input panel */}
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <CardHeader
            eyebrow="Input"
            title="What should we read?"
            action={
              <span className="hidden items-center gap-1 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline-flex">
                Ctrl ↵
              </span>
            }
          />
          <div className="mt-5">
            <FloatingTextArea
              ref={textarea}
              label="Financial news, filing excerpt or market comment"
              value={text}
              onChange={(v) => {
                setText(v);
                if (attempted && v.trim()) setAttempted(false);
              }}
              maxLength={MAX_CHARS}
              status={status}
              helper="Paste a headline, an earnings excerpt or a market comment."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  run(text, true);
                }
              }}
            />
          </div>

          <div className="mt-3">
            <div className="eyebrow mb-2.5">Quick examples</div>
            <div className="flex flex-wrap gap-2">
              {examples.loading &&
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}
              {examples.data?.map((ex) => (
                <motion.button
                  key={ex.label}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setText(ex.text);
                    run(ex.text, true);
                  }}
                  className="rounded-full border border-line bg-white/[0.02] px-3 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  {ex.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => run(text, true)}
              state={buttonState}
              loadingText="Analyzing…"
              successText="Done"
              icon={<Wand2 className="size-4" />}
              className="flex-1 sm:flex-none"
            >
              Analyze sentiment
            </Button>
            {text && (
              <Button variant="ghost" onClick={() => setText("")}>
                Clear
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader eyebrow="Controls" title="Analysis settings" />
          <div className="mt-5 space-y-6">
            <Slider
              label="Explanation depth"
              description="How many contributing terms to show for a prediction."
              value={topN}
              min={3}
              max={15}
              onChange={setTopN}
              format={(v) => `${v} terms`}
            />
            <Toggle
              label="Live analysis"
              description="Re-run the model automatically as you type."
              checked={live}
              onChange={setLive}
            />
            <Toggle
              label="Explain every class"
              description="Also show which terms argued for the classes the model did not pick."
              checked={showAll}
              onChange={setShowAll}
            />
          </div>
        </Card>
      </div>

      {/* ----------------------------------------------- result panel */}
      <div className="space-y-5">
        <Card className="min-h-[520px] p-5 sm:p-6" glow="rgba(127,227,214,0.08)">
          <CardHeader
            eyebrow="Prediction"
            title="Result"
            action={
              phase === "running" && !animated ? (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-accent-soft">
                  <motion.span className="size-1.5 rounded-full bg-accent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  updating
                </span>
              ) : result && phase === "done" ? (
                <span className="font-mono text-[11px] text-faint">{result.latency_ms.toFixed(1)} ms</span>
              ) : null
            }
          />
          <div className="mt-6">
            <AnimatePresence mode="wait">
              {phase === "running" && animated ? (
                <motion.div key="stages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(4px)" }}>
                  <ProcessingStages stage={stage} />
                </motion.div>
              ) : phase === "error" ? (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ErrorState message={error ?? "Unknown error"} onRetry={() => run(text || analyzedText, true)} />
                </motion.div>
              ) : result ? (
                <motion.div
                  key={`result-${result.prediction}-${analyzedText.length}`}
                  initial={animated ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: phase === "running" ? 0.6 : 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ResultView result={result} showAll={showAll} />
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyResult />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <HistoryPanel
          items={history}
          onPick={(h) => {
            setText(h.text);
            run(h.text, true);
          }}
          onClear={() => {
            setHistory([]);
            saveHistory([]);
          }}
        />
      </div>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6 grid size-24 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-accent/25"
            animate={{ scale: [0.6, 1.25], opacity: [0.7, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
          />
        ))}
        <div className="grid size-12 place-items-center rounded-2xl border border-line-strong bg-raised text-accent-soft">
          <Sparkles className="size-5" />
        </div>
      </div>
      <div className="text-[15px] font-medium">Awaiting input</div>
      <p className="mt-1.5 max-w-xs text-sm text-faint">Type or pick an example. You&apos;ll get a label, calibrated confidence and the phrases behind it.</p>
    </div>
  );
}

function ResultView({ result, showAll }: { result: Prediction; showAll: boolean }) {
  const meta = SENTIMENT_META[result.prediction];
  const Icon = meta.icon;
  const [explainClass, setExplainClass] = useState<Sentiment>(result.prediction);
  const [showCleaned, setShowCleaned] = useState(false);
  useEffect(() => setExplainClass(result.prediction), [result.prediction]);
  const target = showAll ? explainClass : result.prediction;
  const terms = showAll ? result.explanations_by_class[target] : result.explanation;

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn("grid size-14 place-items-center rounded-2xl ring-1 ring-inset", meta.bg, meta.ring, meta.text)}
            style={{ boxShadow: `0 0 40px -8px ${meta.color}88` }}
          >
            <Icon className="size-7" />
          </motion.div>
          <div>
            <div className="eyebrow">classification</div>
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={cn("text-4xl font-semibold tracking-[-0.03em]", meta.text)}
            >
              {meta.label}
            </motion.div>
            <div className="mt-1 max-w-[16rem] text-xs text-faint">{meta.blurb}</div>
          </div>
        </div>
        <ConfidenceRing value={result.confidence} color={meta.color} />
      </div>

      {(result.confidence < 0.5 || result.known_terms === 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex gap-2.5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-relaxed text-amber-200/90"
        >
          <AlertTriangle className="mt-px size-4 shrink-0" />
          {result.known_terms === 0
            ? "None of these words appear in the model's vocabulary, so this prediction is close to a guess."
            : "Low confidence: the model is split between classes. Treat this label with caution."}
        </motion.div>
      )}

      <div>
        <div className="eyebrow mb-3">Class probabilities</div>
        <div className="space-y-3">
          {SENTIMENTS.map((s, i) => {
            const m = SENTIMENT_META[s];
            const p = result.probabilities[s];
            return (
              <div key={s} className="grid grid-cols-[92px_1fr_48px] items-center gap-3">
                <span className={cn("flex items-center gap-1.5 text-sm", s === result.prediction ? "text-fg" : "text-muted")}>
                  <m.icon className="size-3.5" /> {m.label}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-r-[4px]"
                    style={{ background: m.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p * 100}%` }}
                    transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-right font-mono text-xs tabular-nums text-muted">{pct(p, 1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="eyebrow">Terms pushing toward “{SENTIMENT_META[target].label.toLowerCase()}”</div>
          {showAll && (
            <Segmented
              size="sm"
              layoutId="explain-class"
              value={explainClass}
              onChange={setExplainClass}
              options={SENTIMENTS.map((s) => ({ value: s, label: SENTIMENT_META[s].label }))}
            />
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={target} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <TermBars terms={terms} color={SENTIMENT_META[target].color} emptyText="No recognised terms supported this class." valueLabel="contribution" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line pt-5">
        <Meta icon={<Clock className="size-3.5" />} label="Latency" value={`${result.latency_ms.toFixed(1)} ms`} />
        <Meta icon={<Cpu className="size-3.5" />} label="Model" value={result.model ?? "—"} />
        <Meta icon={<Zap className="size-3.5" />} label="Known terms" value={String(result.known_terms)} />
      </div>
      <div>
        <button onClick={() => setShowCleaned((v) => !v)} className="flex items-center gap-1 text-xs text-faint transition-colors hover:text-muted">
          <motion.span animate={{ rotate: showCleaned ? 90 : 0 }}>
            <ChevronRight className="size-3.5" />
          </motion.span>
          Preprocessed text seen by the model
        </button>
        <AnimatePresence>
          {showCleaned && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-black/30 p-3 font-mono text-xs text-muted"
            >
              {result.cleaned_text}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-faint">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-medium" title={value}>
        {value}
      </div>
    </div>
  );
}

function HistoryPanel({ items, onPick, onClear }: { items: HistoryItem[]; onPick: (h: HistoryItem) => void; onClear: () => void }) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        eyebrow="Session"
        title={
          <span className="flex items-center gap-2">
            <History className="size-4 text-faint" /> Recent analyses
          </span>
        }
        action={
          items.length > 0 && (
            <button onClick={onClear} className="flex items-center gap-1 text-xs text-faint transition-colors hover:text-neg-soft">
              <Trash2 className="size-3.5" /> Clear
            </button>
          )
        }
      />
      <div className="mt-4">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-faint">
            <Info className="size-4" /> Your analyses will appear here (stored only in this browser).
          </div>
        ) : (
          <motion.ul layout className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map((h) => (
                <motion.li key={h.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <button
                    onClick={() => onPick(h)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <SentimentBadge label={h.prediction} />
                    <span className="min-w-0 flex-1 truncate text-sm text-muted group-hover:text-fg">{h.text}</span>
                    <span className="shrink-0 font-mono text-[11px] text-faint">{pct(h.confidence)}</span>
                    <span className="hidden shrink-0 text-[11px] text-faint sm:block">{relativeTime(h.at)}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </Card>
  );
}
