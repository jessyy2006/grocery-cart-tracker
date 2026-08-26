import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HERO_SURFACES } from "@/components/onboarding/surfaces";

/**
 * Beat 0 — the hero.
 *
 * Five real Cartwise surfaces orbit the centred name and CTA on a slow circle:
 * the yearly receipt, a trip receipt, the lists index, a list mid-trip and the
 * finance chart. The product shows itself before a single feature is named.
 *
 * Mechanics: one wrapper carries the whole ring around, and each surface
 * counter-rotates at the same rate so it travels the circle upright and
 * perfectly square — no tilt at any point on the path. A radial wash of the
 * page colour sits between the ring and the wordmark, so surfaces passing
 * behind it fade out instead of colliding with it.
 *
 * The stage is deliberately full-bleed while the copy below keeps the standard
 * page gutter, so surfaces run right off the edge of the screen instead of
 * vanishing behind an invisible margin.
 */
const ORBIT_SECONDS = 36;

export default function OnboardingHero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const spin = { duration: ORBIT_SECONDS, repeat: Infinity, ease: "linear" as const };

  return (
    <div className="flex min-h-full flex-col bg-background pb-6 safe-top-page safe-bottom">
      <div
        className="relative flex-1 overflow-hidden"
        style={{ "--orbit-r": "clamp(148px, 47vw, 205px)" } as React.CSSProperties}
      >
        <motion.div
          className="absolute inset-0 z-0 will-change-transform"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={spin}
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
                  animate={reduce ? undefined : { rotate: -360 }}
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
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              // Sized to the lockup rather than to the stage: the stage is far
              // taller than it is wide, so a circle keyed to closest-side left a
              // pool too small to clear the wordmark.
              "radial-gradient(ellipse 135px 85px at center, hsl(var(--background)) 0%, hsl(var(--background)) 70%, transparent 100%)",
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-5 text-center"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-display">Cartwise</h1>
          <p className="mt-1.5 text-body text-muted-foreground">your grocery shopping hero</p>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 pt-6">
        <Button
          variant="primaryLight"
          size="lg"
          className="px-10"
          onClick={() => navigate("/onboarding/showcase")}
        >
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
      </div>
    </div>
  );
}
