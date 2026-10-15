"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { forwardRef, useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { cn, formatBytes } from "@/lib/utils";

export type FieldStatus = { kind: "idle" | "error" | "warning" | "success"; message?: string };

/* -------------------------------------------- Floating-label textarea */

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  status: FieldStatus;
  helper?: string;
  rows?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export const FloatingTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function FloatingTextArea(
  { label, value, onChange, maxLength, status, helper, rows = 6, onKeyDown },
  ref,
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  const ratio = value.length / maxLength;

  const border =
    status.kind === "error"
      ? "border-neg/60 shadow-[0_0_0_4px_rgba(255,107,134,0.08)]"
      : focused
        ? "border-accent/55 shadow-[0_0_0_4px_rgba(143,155,255,0.09)]"
        : status.kind === "success"
          ? "border-pos/30"
          : "border-line hover:border-line-strong";

  return (
    <div>
      <div className={cn("relative rounded-2xl border bg-white/[0.02] transition-[border-color,box-shadow] duration-300", border)}>
        <motion.label
          htmlFor={id}
          initial={false}
          animate={floated ? { y: 10, scale: 0.78, color: focused ? "#b9c1ff" : "#5f6677" } : { y: 20, scale: 1, color: "#9aa1b1" }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-none absolute left-4 top-0 origin-left text-[15px]"
        >
          {label}
        </motion.label>
        <textarea
          id={id}
          ref={ref}
          value={value}
          rows={rows}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          aria-invalid={status.kind === "error"}
          className="block w-full resize-none bg-transparent px-4 pb-10 pt-9 text-[15px] leading-relaxed text-fg placeholder:text-faint focus:outline-none"
        />
        <div className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {status.kind === "success" ? (
              <motion.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-pos">
                <CheckCircle2 className="size-4" />
              </motion.span>
            ) : (
              <span key="none" />
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn("h-full rounded-full", ratio > 0.9 ? "bg-neg" : ratio > 0.7 ? "bg-amber-300" : "bg-accent/70")}
                animate={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-faint">
              {value.length.toLocaleString()}/{maxLength.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <FieldMessage status={status} helper={helper} />
    </div>
  );
});

export function FieldMessage({ status, helper }: { status: FieldStatus; helper?: string }) {
  const message = status.message ?? helper;
  const tone =
    status.kind === "error" ? "text-neg" : status.kind === "warning" ? "text-amber-300/90" : status.kind === "success" ? "text-pos/90" : "text-faint";
  return (
    <div className="mt-2 min-h-[18px]">
      <AnimatePresence mode="wait">
        {message && (
          <motion.p
            key={status.kind + message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className={cn("flex items-center gap-1.5 text-xs", tone)}
          >
            {status.kind === "error" && <AlertCircle className="size-3.5" />}
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------ Dropzone */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateCsv(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files are supported.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return `File is ${formatBytes(file.size)}; the limit is 10 MB.`;
  return null;
}

export function Dropzone({ file, onFile, onClear, status }: { file: File | null; onFile: (f: File) => void; onClear: () => void; status: FieldStatus }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4",
              status.kind === "error" ? "border-neg/40 bg-neg/[0.05]" : "border-line-strong bg-white/[0.03]",
            )}
          >
            <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent-soft ring-1 ring-inset ring-accent/25">
              <FileSpreadsheet className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{file.name}</div>
              <div className="text-xs text-faint">{formatBytes(file.size)}</div>
            </div>
            <button onClick={onClear} aria-label="Remove file" className="rounded-lg p-1.5 text-faint transition-colors hover:bg-white/[0.06] hover:text-fg">
              <X className="size-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="zone"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={cn(
              "group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-300",
              over ? "border-accent/70 bg-accent/[0.06]" : "border-line-strong bg-white/[0.015] hover:border-accent/40 hover:bg-white/[0.03]",
            )}
          >
            <motion.div
              animate={over ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="mb-4 grid size-12 place-items-center rounded-2xl border border-line-strong bg-white/[0.04] text-accent-soft"
            >
              <UploadCloud className="size-5" />
            </motion.div>
            <div className="text-sm font-medium">{over ? "Release to upload" : "Drop a CSV here, or click to browse"}</div>
            <div className="mt-1 text-xs text-faint">Up to 10 MB · 50,000 rows · the text column is detected automatically</div>
          </motion.button>
        )}
      </AnimatePresence>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <FieldMessage status={status} />
    </div>
  );
}
