"use client";

import { gsap } from "gsap";
import { ArrowRight, BarChart3, Command } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { ParticleField } from "@/components/layout/Background";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/Display";
import { LiveDemo } from "./LiveDemo";

const HEADLINE = ["Read", "the", "market's", "mood", "in", "milliseconds."];

export function Hero() {
  const root = useRef<HTMLDivElement>(null);

  // GSAP timeline: words rise out of a mask, then supporting copy and CTAs settle in.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from("[data-word]", { yPercent: 110, rotate: 4, duration: 1.1, stagger: 0.06 })
        .from("[data-fade]", { y: 16, opacity: 0, filter: "blur(6px)", duration: 0.9, stagger: 0.08 }, "-=0.75")
        .from("[data-demo]", { y: 40, opacity: 0, scale: 0.97, duration: 1.2 }, "-=0.8");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      <ParticleField className="pointer-events-none absolute inset-0 h-full w-full opacity-70 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />
      {/* light beam */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_42%,rgba(143,155,255,0.13)_50%,transparent_58%)] blur-2xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <div data-fade>
            <StatusIndicator />
          </div>
          <h1 className="mt-7 max-w-4xl text-[clamp(2.6rem,7vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
            {HEADLINE.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <span data-word className={i >= 3 ? "text-accent-gradient inline-block" : "text-gradient inline-block"}>
                  {w}
                  {i < HEADLINE.length - 1 && " "}
                </span>
              </span>
            ))}
          </h1>
          <p data-fade className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
            Polarity classifies financial news and market chatter as positive, neutral or negative, with calibrated confidence and the exact
            phrases behind every call.
          </p>
          <div data-fade className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button href="/workspace" size="lg" icon={<Command className="size-4" />}>
              Open workspace
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button href="/analytics" size="lg" variant="secondary" icon={<BarChart3 className="size-4" />}>
              Explore the model
            </Button>
          </div>
          <div data-fade className="mt-5 font-mono text-[11px] tracking-wide text-faint">
            Analyze → Predict → Understand
          </div>
        </div>

        <div data-demo className="mx-auto mt-16 max-w-3xl">
          <LiveDemo />
        </div>
      </div>
    </section>
  );
}
