"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";
export type ButtonState = "idle" | "loading" | "success";

type Props = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  state?: ButtonState;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  loadingText?: string;
  successText?: string;
  title?: string;
};

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-xl font-medium tracking-tight transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-fg text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_30px_-8px_rgba(143,155,255,0.55)] hover:bg-white",
  secondary: "glass text-fg hover:border-line-strong hover:bg-white/[0.06]",
  ghost: "text-muted hover:bg-white/[0.05] hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

const MotionLink = motion.create(Link);

export function Button({
  children,
  variant = "primary",
  size = "md",
  state = "idle",
  icon,
  href,
  onClick,
  type = "button",
  disabled,
  className,
  loadingText,
  successText,
  title,
}: Props) {
  const busy = state === "loading";
  const content = (
    <>
      {/* light sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          className="relative inline-flex items-center gap-2"
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.18 }}
        >
          {state === "loading" && <Loader2 className="size-4 animate-spin" />}
          {state === "success" && <Check className="size-4" />}
          {state === "idle" && icon}
          {state === "loading" ? loadingText ?? children : state === "success" ? successText ?? children : children}
        </motion.span>
      </AnimatePresence>
    </>
  );

  const motionProps = {
    whileHover: disabled || busy ? undefined : { y: -1 },
    whileTap: disabled || busy ? undefined : { scale: 0.97 },
    transition: { type: "spring" as const, stiffness: 500, damping: 30 },
    className: cn(base, variants[variant], sizes[size], className),
    title,
  };

  if (href) {
    return (
      <MotionLink href={href} {...motionProps}>
        {content}
      </MotionLink>
    );
  }
  return (
    <motion.button type={type} onClick={onClick} disabled={disabled || busy} aria-busy={busy} {...motionProps}>
      {content}
    </motion.button>
  );
}
