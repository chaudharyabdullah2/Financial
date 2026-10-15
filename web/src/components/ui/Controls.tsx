"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Toggle */

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer">
        <div className="text-[13px] font-medium text-fg">{label}</div>
        {description && <div className="mt-0.5 text-xs leading-relaxed text-faint">{description}</div>}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-[22px] w-10 shrink-0 rounded-full border transition-colors duration-300",
          checked ? "border-accent/50 bg-accent/30" : "border-line-strong bg-white/[0.04]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
          className={cn("absolute top-[2px] size-4 rounded-full shadow-md", checked ? "left-[20px] bg-white" : "left-[2px] bg-muted")}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Slider */

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  description,
  format = (v) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  description?: string;
  format?: (v: number) => string;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        <motion.span key={value} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-xs text-accent-soft tabular-nums">
          {format(value)}
        </motion.span>
      </div>
      {description && <div className="mt-0.5 text-xs text-faint">{description}</div>}
      <div className="relative mt-3 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/[0.07]" />
        <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent/60 to-aqua/80" style={{ width: `${fill}%` }} />
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-ink shadow-[0_0_0_4px_rgba(143,155,255,0.18)]"
          style={{ left: `${fill}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Segmented control */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className="inline-flex rounded-xl border border-line bg-white/[0.02] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative rounded-lg font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
            value === o.value ? "text-fg" : "text-faint hover:text-muted",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg border border-line-strong bg-white/[0.07]"
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            />
          )}
          <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- Custom select */

export function Select({
  value,
  options,
  onChange,
  label,
  description,
}: {
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (v: string) => void;
  label: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, options, value]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    }
    if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      onChange(options[active].value);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="mb-1.5 text-[13px] font-medium text-fg">{label}</div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white/[0.025] px-3.5 text-left text-sm transition-colors",
          open ? "border-accent/50" : "border-line hover:border-line-strong",
        )}
      >
        <span className="truncate">{current?.label ?? "Select…"}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="size-4 text-faint" />
        </motion.span>
      </button>
      {description && <div className="mt-1.5 text-xs text-faint">{description}</div>}
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute z-30 mt-2 max-h-64 w-full origin-top overflow-auto rounded-xl border border-line-strong bg-raised/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                  i === active ? "bg-white/[0.06] text-fg" : "text-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-faint">{o.hint}</span>}
                </span>
                {o.value === value && <Check className="size-4 shrink-0 text-accent" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------ Search field */

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="group relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint transition-colors group-focus-within:text-accent" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-line bg-white/[0.025] pl-9 pr-8 text-sm text-fg placeholder:text-faint transition-colors focus:border-accent/50 focus:outline-none"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint hover:text-fg"
          >
            <X className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
