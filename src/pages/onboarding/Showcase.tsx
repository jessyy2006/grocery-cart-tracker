import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SHOWCASE_BEATS } from "@/components/onboarding/demos";
import { cn } from "@/lib/utils";

/** Two loops of the 4s demo before we advance on our own. */
const BEAT_MS = 8000;

/**
 * Beats 1-5 — forward-only feature carousel. Each beat auto-advances after two
 * loops of its demo; a left swipe (or tap on the CTA) accelerates it. Exiting
 * cards recede to the left like frames sliding past in a gallery.
 */
export default function OnboardingShowcase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const timer = useRef<number>();

  const toSignup = useCallback(
    () => navigate(user ? "/onboarding/budget" : "/onboarding/signup", { replace: true }),
    [navigate, user],
  );

  const advance = useCallback(() => {
    setIndex((i) => {
      if (i >= SHOWCASE_BEATS.length - 1) {
        toSignup();
        return i;
      }
      return i + 1;
    });
  }, [toSignup]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(advance, reduce ? BEAT_MS / 2 : BEAT_MS);
    return () => window.clearTimeout(timer.current);
  }, [index, advance, reduce]);

  const beat = SHOWCASE_BEATS[index];
  const isLast = index === SHOWCASE_BEATS.length - 1;

  return (
    <div className="flex min-h-full flex-col overflow-hidden bg-background px-5 pb-6 safe-top-page safe-bottom">
      <div className="flex h-10 items-center justify-end">
        <button
          type="button"
          onClick={toSignup}
          className="press focus-ring -mr-2 rounded-control px-2 py-1 text-small text-muted-foreground"
        >
          Skip
        </button>
      </div>

      <div className="relative mt-2 flex-1">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={beat.id}
            className="absolute inset-0 flex flex-col"
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.4, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 || info.velocity.x < -400) advance();
            }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 64, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -120, scale: 0.86 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto min-h-0 w-full max-w-[420px] flex-1">
              <beat.Demo />
            </div>
            <div className="mt-6">
              <h2 className="text-h1 lowercase">{beat.title}</h2>
              <p className="mt-1.5 text-body text-muted-foreground">{beat.caption}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {SHOWCASE_BEATS.map((b, i) => (
          <span
            key={b.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-5 bg-primary" : "w-1.5 bg-border",
            )}
          />
        ))}
      </div>

      <Button variant="primaryLight" size="lg" className="mt-5 w-full" onClick={advance}>
        {isLast ? "Get started" : "Next"}
      </Button>
    </div>
  );
}
