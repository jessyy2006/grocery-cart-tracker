import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the three signup steps (name, code, budget).
 *
 * The caption plays a one-time entrance on first arrival into the signup half:
 * it fades in large and in full ink, holds for half a second, then greys,
 * shrinks by a quarter and lifts into its resting slot above the headline.
 * Stepping between screens afterwards keeps the header perfectly still, so only
 * the body content moves.
 */
let introPlayed = false;

/** How long the caption sits large and dark before it settles. */
const HOLD_MS = 500;
const HOLD = HOLD_MS / 1000;

const TOTAL_STEPS = 3;

type Props = {
  caption: string;
  title: string;
  /** 1-indexed position in the signup half, drives the progress rule. */
  step: number;
  onBack?: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
};

export function SignupShell({
  caption,
  title,
  step,
  onBack,
  children,
  footer,
  className,
}: Props) {
  const reduce = useReducedMotion();
  // Captured once per mount so a re-render mid-animation can't restart it.
  const playIntro = useRef(!introPlayed && !reduce);
  if (playIntro.current) introPlayed = true;

  // Drives the caption's ink-to-grey settle. Inline colour rather than a class
  // swap: `.text-eyebrow` already sets `text-muted-foreground` from the same
  // utilities layer, so a competing class would be a coin toss.
  const [settled, setSettled] = useState(!playIntro.current);
  useEffect(() => {
    if (settled) return;
    const t = window.setTimeout(() => setSettled(true), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [settled]);

  return (
    <div className="flex min-h-full flex-col bg-background px-5 pb-6 safe-top-page safe-bottom">
      <div className="h-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="press focus-ring -ml-2 flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`Step ${step} of ${TOTAL_STEPS}`}
        className="mb-4 flex gap-1.5"
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className="h-[2px] w-6 overflow-hidden rounded-full bg-border">
            <motion.span
              className="block h-full w-full origin-left bg-primary"
              initial={false}
              animate={{ scaleX: i < step ? 1 : 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        ))}
      </div>

      <motion.p
        className="text-eyebrow"
        initial={playIntro.current ? { opacity: 0, y: 72, scale: 1.35 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          opacity: { duration: 0.3, ease: "easeOut" },
          y: { duration: 0.45, delay: HOLD, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.45, delay: HOLD, ease: [0.22, 1, 0.36, 1] },
        }}
        style={{
          transformOrigin: "left center",
          color: settled ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
          transition: "color 300ms ease-out",
        }}
      >
        {caption}
      </motion.p>

      <motion.h1
        className="text-display mt-1.5 lowercase"
        initial={playIntro.current ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: playIntro.current ? HOLD + 0.35 : 0.12,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {title}
      </motion.h1>

      <motion.div
        className={cn("mt-8 flex-1", className)}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: playIntro.current ? HOLD + 0.5 : 0.04,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>

      <div className="mt-6 space-y-3">{footer}</div>
    </div>
  );
}
