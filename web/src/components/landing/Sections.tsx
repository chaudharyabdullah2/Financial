"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Binary, Brain, FileSpreadsheet, Scale, ScanText, Sparkles, Telescope } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber, Reveal, SectionTitle, Skeleton } from "@/components/ui/Display";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { num } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export function MetricsStrip() {
  const { data, error } = useApi(api.modelInfo);
  const meta = data?.metadata;
  const items = meta
    ? [
        { label: "Test accuracy", value: meta.test_accuracy * 100, fmt: (v: number) => `${v.toFixed(1)}%` },
        { label: "Macro F1", value: meta.test_macro_f1 * 100, fmt: (v: number) => `${v.toFixed(1)}%` },
        { label: "Labelled sentences", value: meta.data.final_rows, fmt: (v: number) => num(Math.round(v)) },
        { label: "Noisy labels fixed", value: meta.data.conflicts_resolved, fmt: (v: number) => num(Math.round(v)) },
      ]
    : null;

  if (error) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="glass grid grid-cols-2 divide-line overflow-hidden rounded-2xl md:grid-cols-4 md:divide-x">
        {(items ?? Array.from({ length: 4 })).map((it, i) => (
          <div key={i} className="border-line p-6 [&:nth-child(-n+2)]:border-b md:[&:nth-child(-n+2)]:border-b-0">
            {it ? (
              <Reveal delay={i * 0.06}>
                <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  <AnimatedNumber value={it.value} format={it.fmt} />
                </div>
                <div className="mt-1.5 text-xs text-faint">{it.label}</div>
              </Reveal>
            ) : (
              <>
                <Skeleton className="h-9 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: ScanText, title: "Clean", text: "Strip markup and URLs, normalise whitespace and case. The same function runs at training and inference time." },
  { icon: Binary, title: "Vectorise", text: "TF-IDF over word 1–2 grams plus character 2–5 grams, so “profit”, “profits” and “$SPY” all carry signal." },
  { icon: Scale, title: "Classify", text: "Linear models tuned with grid search and balanced class weights, selected by cross-validated macro F1." },
  { icon: Telescope, title: "Explain", text: "Calibrated probabilities and the per-term contributions that pushed the decision, for every class." },
];

export function Pipeline() {
  const root = useRef<HTMLDivElement>(null);

  // Scroll-linked: the connector line draws itself and steps light up in sequence.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-line]", { scaleX: 0 }, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 },
      });
      gsap.from("[data-step]", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 78%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <SectionTitle
        eyebrow="How it works"
        title="A transparent pipeline, end to end."
        subtitle="No black box. Every prediction flows through four inspectable stages, and you can see what each one contributes."
      />
      <div ref={root} className="relative mt-14">
        <div className="absolute left-0 right-0 top-6 hidden h-px bg-line md:block" />
        <div data-line className="absolute left-0 right-0 top-6 hidden h-px origin-left bg-gradient-to-r from-accent via-aqua to-accent/0 md:block" />
        <div className="grid gap-5 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div data-step key={s.title} className="relative">
              <div className="relative z-10 mb-6 grid size-12 place-items-center rounded-2xl border border-line-strong bg-raised text-accent-soft shadow-[0_0_30px_-6px_rgba(143,155,255,0.5)]">
                <s.icon className="size-5" />
              </div>
              <div className="font-mono text-[11px] text-faint">0{i + 1}</div>
              <h3 className="mt-1 text-lg font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Brain, title: "Single-text analysis", text: "Paste a headline or filing excerpt. Get the label, calibrated probabilities and the phrases that drove it, with live analysis as you type." },
  { icon: FileSpreadsheet, title: "Batch scoring", text: "Drop a CSV with up to 50,000 rows. The text column is detected for you; filter, search and export the scored results." },
  { icon: Sparkles, title: "Model analytics", text: "Confusion matrix, per-class metrics, model comparison and the model's most confident mistakes, all from the latest training run." },
];

export function Features() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <SectionTitle eyebrow="Capabilities" title="Built for analysts who ask “why?”" />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.08}>
            <Card tilt={5} className="h-full p-6">
              <div className="mb-5 grid size-10 place-items-center rounded-xl bg-white/[0.05] text-accent-soft ring-1 ring-inset ring-line-strong">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-[17px] font-medium tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <Reveal>
        <div className="glass hairline-top relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(143,155,255,0.22),transparent)]" />
          <div className="relative">
            <h2 className="text-gradient text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Start reading the signal.</h2>
            <p className="mx-auto mt-4 max-w-md text-muted">Open the workspace and analyze your first sentence in under a second.</p>
            <div className="mt-8 flex justify-center">
              <Button href="/workspace" size="lg">
                Open workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
