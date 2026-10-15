"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Degrees of 3D tilt toward the cursor. 0 disables tilt (spotlight stays). */
  tilt?: number;
  glow?: string;
};

/** Glass card with a cursor-following spotlight and an optional gentle 3D tilt. */
export function Card({ children, className, tilt = 0, glow = "rgba(143,155,255,0.13)" }: Props) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [tilt, -tilt]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-tilt, tilt]), spring);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, ${glow}, transparent 70%)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }
  function onLeave() {
    mx.set(-400);
    my.set(-400);
    px.set(0.5);
    py.set(0.5);
  }

  const useTilt = tilt > 0 && !reduced;
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={useTilt ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      className={cn(
        "glass hairline-top group/card relative rounded-2xl transition-[border-color,box-shadow] duration-300 hover:border-line-strong focus-within:border-line-strong",
        className,
      )}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{ background: spotlight }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function CardHeader({ eyebrow, title, action, className }: { eyebrow?: string; title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h3 className="text-[15px] font-medium tracking-tight text-fg">{title}</h3>
      </div>
      {action}
    </div>
  );
}
