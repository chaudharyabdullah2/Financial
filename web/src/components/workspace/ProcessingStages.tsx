"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const STAGES = [
  { key: "input", label: "Analyzing input", detail: "Cleaning markup, URLs and whitespace" },
  { key: "features", label: "Processing features", detail: "Word + character n-gram TF-IDF" },
  { key: "model", label: "Running model", detail: "Calibrated linear classifier" },
  { key: "result", label: "Generating result", detail: "Probabilities and term attributions" },
  { key: "done", label: "Analysis complete", detail: "" },
] as const;

/**
 * Vertical stepper. `stage` is the index of the step in progress; steps before
 * it are complete. When `failed` is set the current step shows an error.
 */
export function ProcessingStages({ stage, failed = false }: { stage: number; failed?: boolean }) {
  const progress = Math.min(1, stage / (STAGES.length - 1));
  return (
    <div className="py-2" aria-live="polite">
      <div className="mb-6 flex items-center gap-3">
        <div className="relative size-9">
          <motion.span
            className="absolute inset-0 rounded-full border border-accent/40"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: "conic-gradient(from 0deg, transparent, rgba(143,155,255,0.9), transparent 70%)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
          <span className="absolute inset-[3px] rounded-full bg-raised" />
          <span className="absolute inset-[11px] rounded-full bg-accent shadow-[0_0_14px_rgba(143,155,255,0.9)]" />
        </div>
        <div>
          <div className="text-sm font-medium">Processing</div>
          <div className="font-mono text-[11px] text-faint">{Math.round(progress * 100)}% · pipeline running</div>
        </div>
      </div>

      <ol className="relative space-y-1">
        <div className="absolute bottom-4 left-[13px] top-4 w-px bg-line" />
        <motion.div
          className="absolute left-[13px] top-4 w-px origin-top bg-gradient-to-b from-accent to-aqua"
          style={{ height: "calc(100% - 2rem)" }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: progress }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
        {STAGES.map((s, i) => {
          const done = i < stage || (i === STAGES.length - 1 && stage === i);
          const active = i === stage && !done;
          const error = failed && i === stage;
          return (
            <motion.li
              key={s.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i <= stage ? 1 : 0.35, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex items-start gap-4 py-2"
            >
              <span
                className={cn(
                  "relative z-10 grid size-[27px] shrink-0 place-items-center rounded-full border text-[10px] transition-colors duration-300",
                  error
                    ? "border-neg/60 bg-neg/15 text-neg-soft"
                    : done
                      ? "border-accent/50 bg-accent/15 text-accent-soft"
                      : active
                        ? "border-accent/60 bg-ink text-accent-soft"
                        : "border-line-strong bg-ink text-faint",
                )}
              >
                {error ? (
                  <X className="size-3.5" />
                ) : done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <Check className="size-3.5" />
                  </motion.span>
                ) : active ? (
                  <motion.span className="size-2 rounded-full bg-accent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity }} />
                ) : (
                  <span className="font-mono">{i + 1}</span>
                )}
              </span>
              <div className="pt-[3px]">
                <div className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", active || done ? "text-fg" : "text-faint")}>{s.label}</div>
                {s.detail && <div className="mt-0.5 text-xs text-faint">{s.detail}</div>}
                {active && (
                  <div className="mt-2 h-0.5 w-40 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
