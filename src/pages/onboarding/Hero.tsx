import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HERO_SURFACES } from "@/components/onboarding/surfaces";

/**
 * Beat 0 — the hero.
 *
 * Five real Cartwise surfaces orbit the centred name and CTA on a slow circle:
 * a trip receipt, the monthly summary, the lists index, a list mid-trip and the
 * finance chart. The product shows itself before a single feature is named.
 *
 * Mechanics: one wrapper carries the whole ring around, and each surface
 * counter-rotates at the same rate so it travels the circle without tumbling.
 * Each keeps a fixed tilt on top of that, so the ring reads as a scatter of
 * paper rather than a carousel. A radial wash of the page colour sits between
 * the ring and the lockup, so surfaces passing behind the wordmark fade out
 * instead of colliding with it.
 */
const ORBIT_SECONDS = 36;

/** Fixed per-surface tilt, degrees. Kept small — paper, not confetti. */
const TILT = [-7, 6, -4, 9, -10];

export default function OnboardingHero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const spin = { duration: ORBIT_SECONDS, repeat: Infinity, ease: "linear" as const };

  return (
    <div className="flex min-h-full flex-col bg-background px-5 pb-6 safe-top-page safe-bottom">
      <div
        className="relative flex-1 overflow-hidden"
        style={{ "--orbit-r": "clamp(118px, 40vw, 172px)" } as React.CSSProperties}
      >
        <motion.div
          className="absolute inset-0 will-change-transform"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={spin}
        >
          {HERO_SURFACES.map((Surface, i) => {
            const angle = (360 / HERO_SURFACES.length) * i;
            const tilt = TILT[i];
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
                  animate={reduce ? { rotate: tilt } : { rotate: [tilt, tilt - 360] }}
                  transition={spin}
                >
                  <Surface />
                </motion.div>
              </div>
            );
          })}
        </motion.div>

        {/* Clears a pool of page colour for the lockup to sit in. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              // closest-side keys the stops to half the stage's short edge, so the
              // wash covers the lockup and is gone before the ring. Against the
              // default farthest-corner it stayed ~45% opaque at the orbit radius
              // and greyed the surfaces out.
              "radial-gradient(circle closest-side at center, hsl(var(--background)) 0%, hsl(var(--background)) 22%, transparent 52%)",
          }}
        />

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-display">Cartwise</h1>
          <p className="mt-1.5 text-body text-muted-foreground">your grocery shopping hero</p>
          <Button
            variant="primaryLight"
            size="lg"
            className="mt-6 px-10"
            onClick={() => navigate("/onboarding/showcase")}
          >
            show me how
          </Button>
        </motion.div>
      </div>

      {/*
        A text link, not a second full-width button: the returning-user path
        shouldn't carry the same visual weight as the primary CTA on the one
        screen where a new user's intent matters most.
      */}
      <button
        type="button"
        onClick={() => navigate(user ? "/onboarding/budget" : "/onboarding/signup")}
        className="press focus-ring mx-auto mt-4 rounded-control px-3 py-1.5 text-small text-muted-foreground"
      >
        {user ? "continue where you left off" : "already have an account? log in"}
      </button>
    </div>
  );
}
