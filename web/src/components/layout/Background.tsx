"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

/** Fixed app-wide backdrop: drifting grid, two slow light blobs and a cursor glow. */
export function Backdrop() {
  const reduced = useReducedMotion();
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const sx = useSpring(x, { stiffness: 80, damping: 20 });
  const sy = useSpring(y, { stiffness: 80, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(600px circle at ${sx}px ${sy}px, rgba(143,155,255,0.07), transparent 65%)`;

  useEffect(() => {
    if (reduced) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced, x, y]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 animate-grid-drift opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <motion.div
        className="absolute -top-[30vh] left-[10%] h-[70vh] w-[55vw] rounded-full bg-[radial-gradient(closest-side,rgba(110,123,255,0.20),transparent)] blur-3xl"
        animate={reduced ? undefined : { x: [0, 60, -30, 0], y: [0, 40, 10, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-[20vh] right-[5%] h-[55vh] w-[40vw] rounded-full bg-[radial-gradient(closest-side,rgba(127,227,214,0.11),transparent)] blur-3xl"
        animate={reduced ? undefined : { x: [0, -50, 20, 0], y: [0, 30, 60, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="absolute inset-0" style={{ background: glow }} />
      <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}

/**
 * Canvas constellation for the hero: slow particles linked by faint lines,
 * gently repelled by the cursor. Particle count scales with area, the loop
 * pauses off-screen / in background tabs, and it renders one static frame
 * when the user prefers reduced motion.
 */
export function ParticleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number };
    let particles: P[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const LINK = 130;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.4,
        hue: Math.random() < 0.7 ? 232 : 170,
      }));
    }

    function frame() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const f = (1 - Math.sqrt(d2) / 140) * 0.6;
          p.x += (dx / Math.sqrt(d2 + 0.01)) * f;
          p.y += (dy / Math.sqrt(d2 + 0.01)) * f;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx!.strokeStyle = `rgba(160,170,255,${(1 - d / LINK) * 0.14})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx!.fillStyle = `hsla(${p.hue}, 90%, 80%, 0.75)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop() {
      if (visible && !document.hidden) frame();
      raf = requestAnimationFrame(loop);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (reduced) {
      frame();
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      loop();
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      ro.disconnect();
    };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
