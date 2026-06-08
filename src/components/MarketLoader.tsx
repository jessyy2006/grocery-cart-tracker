import { motion, useReducedMotion } from "framer-motion";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketLoaderProps {
  className?: string;
  /** Minimum height while loading. Defaults to a comfortable page area. */
  minHeight?: string;
  label?: string;
}

/**
 * Branded loading state — a gentle sprout pulse on cream paper.
 * Used as a unified replacement for skeleton boxes / premature empty states.
 */
export function MarketLoader({ className, minHeight = "60vh", label }: MarketLoaderProps) {
  const reduce = useReducedMotion();
  return (
    <div
      className={cn("flex w-full flex-col items-center justify-center gap-3", className)}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
    >
      <motion.span
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        animate={
          reduce
            ? { opacity: 0.8 }
            : { opacity: [0.55, 1, 0.55], scale: [0.96, 1.02, 0.96] }
        }
        transition={
          reduce
            ? { duration: 0.2 }
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/60 text-primary"
      >
        <Sprout className="h-6 w-6" strokeWidth={1.75} />
      </motion.span>
      {label && <p className="text-small text-muted-foreground">{label}</p>}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
