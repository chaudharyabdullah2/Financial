"use client";

import { animate, motion, useInView, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHealth } from "@/lib/hooks";
import type { Sentiment } from "@/lib/types";
import { cn, SENTIMENT_META } from "@/lib/utils";

export { Skeleton } from "./Controls";

/* ---------------------------------------------------------- AnimatedNumber */

export function AnimatedNumber({ value, format = (v) => v.toFixed(0), duration = 1.1 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const from = useRef(0);
  const [display, setDisplay] = useState(format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    from.current = value;
    return () => controls.stop();
    // format is usually an inline closure; re-running on identity change would restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}

/* ---------------------------------------------------------- SentimentBadge */

export function SentimentBadge({ label, size = "sm" }: { label: Sentiment; size?: "sm" | "md" }) {
  const m = SENTIMENT_META[label];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        m.bg,
        m.text,
        m.ring,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
      {m.label}
    </span>
  );
}

/* ---------------------------------------------------------- ConfidenceRing */

export function ConfidenceRing({ value, color, size = 132 }: { value: number; color: string; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-semibold tracking-tight">
            <AnimatedNumber value={value * 100} format={(v) => `${v.toFixed(0)}%`} />
          </div>
          <div className="eyebrow mt-0.5 !text-[9px]">confidence</div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- StatusIndicator */

export function StatusIndicator({ compact = false }: { compact?: boolean }) {
  const { health, online } = useHealth();
  const color = online === null ? "bg-faint" : online ? "bg-ok" : "bg-neg";
  const text = online === null ? "Connecting…" : online ? (compact ? "Online" : `Model online · ${health?.model ?? "ready"}`) : "API offline";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-muted">
      <span className="relative flex size-2">
        {online && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", color)} />}
        <span className={cn("relative size-2 rounded-full", color)} />
      </span>
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ Reveal */

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, className }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h2 className="text-gradient text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}

/* -------------------------------------------------------- ErrorState */

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-neg/25 bg-neg/[0.06] p-5 text-sm">
      <div className="font-medium text-neg">Something went wrong</div>
      <div className="mt-1 text-muted">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-xs font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
          Try again
        </button>
      )}
    </div>
  );
}
