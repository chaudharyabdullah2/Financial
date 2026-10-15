"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/Display";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/workspace", label: "Workspace" },
  { href: "/analytics", label: "Analytics" },
  { href: "/about", label: "About" },
];

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Polarity home">
      <span className="relative grid size-7 place-items-center rounded-lg border border-line-strong bg-gradient-to-b from-white/10 to-white/[0.02]">
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path d="M4 15.5 9 10l4 4 7-8" stroke="url(#lg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="lg" x1="4" y1="16" x2="20" y2="6">
              <stop stopColor="#b9c1ff" />
              <stop offset="1" stopColor="#7fe3d6" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 rounded-lg opacity-0 shadow-[0_0_20px_rgba(143,155,255,0.45)] transition-opacity duration-500 group-hover:opacity-100" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Polarity</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="fixed inset-x-0 top-0 z-50" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 transition-[background-color,border-color,box-shadow] duration-500 sm:px-5",
          "mx-4 sm:mx-6 lg:mx-auto",
          scrolled || open ? "glass shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)]" : "border border-transparent",
        )}
      >
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("relative rounded-lg px-3 py-1.5 text-[13px] transition-colors", isActive(l.href) ? "text-fg" : "text-muted hover:text-fg")}
            >
              {isActive(l.href) && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-white/[0.07]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              )}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <StatusIndicator compact />
          <Button href="/workspace" size="sm">
            Launch app
          </Button>
        </div>
        <button className="rounded-lg p-2 text-muted md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass mx-4 mt-2 flex flex-col gap-1 rounded-2xl p-2 md:hidden"
          >
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={cn("rounded-xl px-3 py-2.5 text-sm", isActive(l.href) ? "bg-white/[0.07] text-fg" : "text-muted")}>
                {l.label}
              </Link>
            ))}
            <div className="px-3 py-2">
              <StatusIndicator />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span>Financial sentiment intelligence</span>
        </div>
        <div>Academic / testing prototype. Not financial advice.</div>
      </div>
    </footer>
  );
}
