import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HERO_SURFACES } from "@/components/onboarding/surfaces";

/**
 * Beat 0 — the hero.
 *
 * Five real Cartwise surfaces orbit the centred wordmark on a slow circle: the
 * yearly receipt, a trip receipt, the lists index, a list mid-trip and the
 * finance chart. The product shows itself before a single feature is named.
 *
 * Mechanics: one wrapper carries the ring around, and each surface
 * counter-rotates at the same rate so it travels the circle upright and
 * perfectly square. A radial wash of the page colour sits between the ring and
 * the wordmark so surfaces passing behind it fade out rather than collide.
 *
 * The hand-off to the showcase is why the spin and the collapse live on two
 * separate wrappers. Tapping the CTA shrinks the ring's radius to nothing while
 * the outer wrapper keeps turning at its constant rate, so every surface spirals
 * inward rather than sliding straight to the middle — the circular motion the
 * frames call for. Splitting the two also means the swirl looks identical
 * wherever the ring happened to be when the tap landed; driving both from one
 * animation made the arc length depend on the tap moment.
 */
const ORBIT_SECONDS = 36;

/** How long the swirl runs before the showcase takes over. */
const LEAVE_MS = 560;

/** Extra rotation the ring sweeps through as it collapses. */
const SWEEP_DEG = 130;

export default function OnboardingHero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const spin = { duration: ORBIT_SECONDS, repeat: Infinity, ease: "linear" as const };

  const toShowcase = useCallback(() => {
    if (leaving) return;
    if (reduce) {
      navigate("/onboarding/showcase");
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(() => navigate("/onboarding/showcase"), LEAVE_MS);
  }, [leaving, navigate, reduce]);

  return (
    <div className="flex min-h-full flex-col bg-background pb-6 safe-top-page safe-bottom">
      <div
        className="relative flex-1 overflow-hidden"
        style={{ "--orbit-r": "clamp(124px, 37vw, 158px)" } as React.CSSProperties}
      >
        {/* Outer wrapper: the constant-rate spin, never interrupted. */}
        <motion.div
          className="absolute inset-0 z-0 will-change-transform"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={spin}
        >
          {/*
            Middle wrapper: the exit's own sweep. The resting orbit is far too
            slow to carry the swirl on its own — at 36s a revolution, the 560ms
            collapse would turn the ring 5.6°, which reads as a straight drop to
            the middle. This adds SWEEP_DEG on top over the same window, so the
            surfaces travel a real arc inward.
          */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: leaving ? SWEEP_DEG : 0 }}
            transition={{ duration: LEAVE_MS / 1000, ease: [0.32, 0, 0.67, 0] }}
          >
          {/* Inner wrapper: the radius, collapsed on the way out. */}
          <motion.div
            className="absolute inset-0"
            animate={{ scale: leaving ? 0.04 : 1 }}
            transition={{ duration: LEAVE_MS / 1000, ease: [0.5, 0, 0.75, 0] }}
          >
            {HERO_SURFACES.map((Surface, i) => {
              const angle = (360 / HERO_SURFACES.length) * i;
              return (
                <div
                  key={i}
                  aria-hidden
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(var(--orbit-r) * -1)) rotate(${-angle}deg)`,
                  }}
                >
                  <motion.div
                    animate={
                      reduce ? undefined : { rotate: -360, opacity: leaving ? 0 : 1 }
                    }
                    transition={{
                      rotate: spin,
                      opacity: { duration: 0.4, delay: 0.16, ease: "easeIn" },
                    }}
                  >
                    <Surface />
                  </motion.div>
                </div>
              );
            })}
            </motion.div>
          </motion.div>
        </motion.div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              // Sized to the widest thing in the lockup — the subtitle, at
              // 200px — and no wider. On a 390px screen there is no radius that
              // both clears that subtitle and keeps a 100px card fully on
              // screen; the two constraints cross. So the surfaces are allowed
              // to graze the type and this wash resolves the few pixels where
              // they meet. Any wider and it starts greying whole cards.
              "radial-gradient(ellipse 110px 60px at center, hsl(var(--background)) 0%, hsl(var(--background)) 72%, transparent 100%)",
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-5 text-center"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: leaving ? 0 : 1, y: 0 }}
          transition={{ duration: leaving ? 0.24 : 0.5, delay: leaving ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-display">Cartwise</h1>
          <p className="mt-1.5 text-body text-muted-foreground">your grocery shopping hero</p>
        </motion.div>
      </div>

      <motion.div
        className="flex flex-col items-center gap-3 px-5 pt-6"
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <Button variant="primaryLight" size="lg" className="px-10" onClick={toShowcase}>
          show me how
        </Button>
        {/*
          A text link, not a second full-width button: the returning-user path
          shouldn't carry the same visual weight as the primary CTA on the one
          screen where a new user's intent matters most.
        */}
        <button
          type="button"
          onClick={() => navigate(user ? "/onboarding/budget" : "/onboarding/signup")}
          className="press focus-ring rounded-control px-3 py-1.5 text-small text-muted-foreground"
        >
          {user ? "continue where you left off" : "already have an account? log in"}
        </button>
      </motion.div>
    </div>
  );
}
