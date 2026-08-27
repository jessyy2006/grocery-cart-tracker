import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SHOWCASE_BEATS } from "@/components/onboarding/demos";
import { cn } from "@/lib/utils";

const LAST = SHOWCASE_BEATS.length - 1;

/**
 * Beats 1-5 — the feature carousel. Per the frames: title at the top, the demo
 * in the middle, the line underneath it, and nothing else competing.
 *
 * Entirely self-paced — each demo loops until the user moves on, via the CTA, a
 * swipe, the dots or the back chevron. There is no auto-advance, so a beat is
 * never taken away mid-read, and no skip control: the dots jump straight to the
 * last beat, which makes a separate skip redundant.
 *
 * Motion follows the gesture: going forward, the outgoing card recedes left and
 * the next arrives from the right, like frames sliding past in a gallery. Going
 * back runs the same choreography mirrored, so the direction you swipe is
 * always the direction the content travels.
 */
export default function OnboardingShowcase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  // Mirrors `index` synchronously so two navigations inside one frame can't
  // both read the same stale value off state.
  const indexRef = useRef(0);
  // The very first beat blooms out of the middle, picking up where the hero's
  // swirl collapsed, instead of sliding in from the right like every later
  // beat. Only true for the first render of this screen.
  const bloomRef = useRef(true);
  const bloom = bloomRef.current && !reduce;
  useEffect(() => {
    bloomRef.current = false;
  }, []);

  const toSignup = useCallback(
    () => navigate(user ? "/onboarding/budget" : "/onboarding/signup", { replace: true }),
    [navigate, user],
  );

  const goTo = useCallback((next: number) => {
    const cur = indexRef.current;
    const clamped = Math.max(0, Math.min(LAST, next));
    if (clamped === cur) return;
    indexRef.current = clamped;
    setDir(clamped > cur ? 1 : -1);
    setIndex(clamped);
  }, []);

  const advance = useCallback(() => {
    if (indexRef.current >= LAST) {
      toSignup();
      return;
    }
    goTo(indexRef.current + 1);
  }, [goTo, toSignup]);

  const goBack = useCallback(() => goTo(indexRef.current - 1), [goTo]);

  const beat = SHOWCASE_BEATS[index];
  const isLast = index === LAST;

  const variants = {
    enter: (d: number) =>
      reduce ? { opacity: 0 } : { opacity: 0, x: d > 0 ? 64 : -64, scale: 0.94 },
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) =>
      reduce ? { opacity: 0 } : { opacity: 0, x: d > 0 ? -120 : 120, scale: 0.86 },
  };

  return (
    <div className="flex min-h-full flex-col overflow-hidden bg-background px-5 pb-6 safe-top-page safe-bottom">
      <div className="h-10">
        <button
          type="button"
          onClick={goBack}
          aria-label="Previous feature"
          // Held in the layout rather than unmounted, so the card below doesn't
          // shift when the first beat has no back target.
          className={cn(
            "press focus-ring -ml-2 flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground",
            index === 0 && "pointer-events-none opacity-0",
          )}
          tabIndex={index === 0 ? -1 : undefined}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1">
        <AnimatePresence initial={bloom} mode="popLayout" custom={dir}>
          <motion.div
            key={beat.id}
            custom={dir}
            variants={variants}
            initial={bloom ? { opacity: 0, scale: 0.62, x: 0 } : "enter"}
            animate="center"
            exit="exit"
            className="absolute inset-0 flex flex-col"
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 || info.velocity.x < -400) advance();
              else if (info.offset.x > 60 || info.velocity.x > 400) goBack();
            }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-h1 text-center lowercase">{beat.title}</h2>

            <div className="flex min-h-0 flex-1 items-center">
              <div className="mx-auto w-full max-w-[420px]">
                <beat.Demo />
              </div>
            </div>

            <p className="text-center text-body text-muted-foreground">{beat.caption}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1">
        {SHOWCASE_BEATS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to ${b.title.replace(".", "")}`}
            aria-current={i === index ? "true" : undefined}
            // The bar is small by design; the button pads it out to a tappable
            // target without changing how the row reads.
            className="focus-ring group rounded-control px-1 py-2"
          >
            <span
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-primary" : "w-1.5 bg-border group-hover:bg-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Button variant="primaryLight" size="lg" className="px-10" onClick={advance}>
          {isLast ? "get started" : "next"}
        </Button>
      </div>
    </div>
  );
}
