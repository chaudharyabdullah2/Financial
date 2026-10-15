"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Term } from "@/lib/types";

/**
 * Horizontal bars for term weights, single hue (the class color).
 * Bars are anchored at the baseline with 4px rounded data-ends; hovering a row
 * shows its exact value. Labels and values use text tokens, not the series color.
 */
export function TermBars({ terms, color, emptyText = "No terms", valueLabel = "weight" }: { terms: Term[]; color: string; emptyText?: string; valueLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!terms.length) return <div className="py-4 text-sm text-faint">{emptyText}</div>;
  const max = Math.max(...terms.map((t) => t.weight));

  return (
    <ul className="space-y-1">
      {terms.map((t, i) => (
        <li
          key={t.term}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          className="grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.04]"
        >
          <span className="truncate font-mono text-[12px] text-fg" title={t.term}>
            {t.term}
          </span>
          <div className="relative h-2">
            <motion.div
              className="h-full rounded-r-[4px]"
              style={{ background: color, opacity: hover === null || hover === i ? 1 : 0.45 }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, (t.weight / max) * 100)}%` }}
              transition={{ duration: 0.8, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-right font-mono text-[11px] tabular-nums text-muted">
            {hover === i ? `${valueLabel} ` : ""}
            {t.weight.toFixed(3)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Recharts tooltip body styled to match the glass surfaces. */
export function ChartTooltip({
  active,
  payload,
  label,
  format = (v) => String(v),
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string | number }[];
  label?: string | number;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line-strong bg-raised/95 px-3 py-2 text-xs shadow-2xl shadow-black/60 backdrop-blur-xl">
      {label !== undefined && <div className="mb-1.5 font-medium text-fg">{label}</div>}
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-muted">
              <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-mono tabular-nums text-fg">{format(Number(p.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
