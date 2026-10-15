"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SentimentBadge, Skeleton } from "@/components/ui/Display";
import { api } from "@/lib/api";
import { SENTIMENTS, type Prediction } from "@/lib/types";
import { SENTIMENT_META } from "@/lib/utils";

type Item = { text: string; result: Prediction };

/** Hero showcase: real predictions from the API, typed out one sentence at a time. */
export function LiveDemo() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    api
      .examples()
      .then((ex) => Promise.all(ex.map((e) => api.predict(e.text, 3).then((result) => ({ text: e.text, result })))))
      .then(setItems)
      .catch(() => setFailed(true));
  }, []);

  const current = items?.[index];
  const done = current ? typed >= current.text.length : false;

  useEffect(() => {
    if (!current) return;
    if (!done) {
      const id = setTimeout(() => setTyped((t) => t + 2), 18);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % items!.length);
      setTyped(0);
    }, 3600);
    return () => clearTimeout(id);
  }, [current, done, typed, items]);

  return (
    <Card tilt={3} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="ml-3 font-mono text-[11px] text-faint">POST /api/predict</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
          <Activity className="size-3.5 text-aqua" /> live inference
        </span>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[1.4fr_1fr] sm:p-6">
        {failed ? (
          <div className="col-span-full flex items-center gap-3 py-6 text-sm text-muted">
            <WifiOff className="size-4 text-neg" />
            Start the API (<code className="font-mono text-xs text-fg">python -m uvicorn api.main:app --port 8000</code>) to see live predictions.
          </div>
        ) : !current ? (
          <>
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="eyebrow mb-3">input</div>
              <p className="min-h-[5.5rem] text-[15px] leading-relaxed text-fg">
                {current.text.slice(0, typed)}
                <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-accent" />
              </p>
            </div>
            <div>
              <div className="eyebrow mb-3">output</div>
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                    <div className="flex items-center justify-between">
                      <SentimentBadge label={current.result.prediction} size="md" />
                      <span className="font-mono text-xs text-faint">{current.result.latency_ms.toFixed(1)} ms</span>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {SENTIMENTS.map((s, i) => (
                        <div key={s} className="grid grid-cols-[64px_1fr_40px] items-center gap-2 text-xs">
                          <span className="text-muted">{SENTIMENT_META[s].label}</span>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: SENTIMENT_META[s].color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${current.result.probabilities[s] * 100}%` }}
                              transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                          <span className="text-right font-mono tabular-nums text-faint">{(current.result.probabilities[s] * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-1 text-xs text-faint">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="size-1.5 rounded-full bg-accent"
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </span>
                    reading…
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
      {items && (
        <div className="flex gap-1.5 px-5 pb-4 sm:px-6">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Show example ${i + 1}`}
              onClick={() => {
                setIndex(i);
                setTyped(0);
              }}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
            >
              {i === index && <motion.span layoutId="demo-progress" className="block h-full w-full bg-accent/60" />}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
