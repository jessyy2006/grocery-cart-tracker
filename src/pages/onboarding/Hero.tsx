import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SHOWCASE_BEATS } from "@/components/onboarding/demos";
import { ListChecks, Coins, ScanLine, Receipt, LineChart } from "lucide-react";

/**
 * Beat 0 — the hero. Five labelled cards physically ring the CTA; tapping
 * "see how it works" hands off to the showcase carousel, which picks the cards
 * up from roughly where they sit here.
 */
const ICONS = [ListChecks, Coins, ScanLine, Receipt, LineChart];

// Ring positions (percentage of the stage), clockwise from top-left.
const RING = [
  { x: 2, y: 4, rot: -7 },
  { x: 54, y: 0, rot: 6 },
  { x: 54, y: 36, rot: 9 },
  { x: 28, y: 70, rot: -4 },
  { x: 0, y: 38, rot: -10 },
];

export default function OnboardingHero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();

  return (
    <div className="flex min-h-full flex-col bg-background px-5 pb-6 safe-top-page safe-bottom">
      <div>
        <p className="text-eyebrow">cartwise</p>
        <h1 className="text-display mt-1.5 lowercase">plan it. price it. keep it.</h1>
        <p className="mt-2 text-body text-muted-foreground">
          The grocery list that tells you what it costs.
        </p>
      </div>

      <div className="relative my-6 flex-1">
        {SHOWCASE_BEATS.map((beat, i) => {
          const Icon = ICONS[i];
          const pos = RING[i];
          return (
            <motion.div
              key={beat.id}
              className="absolute w-[44%] rounded-card border border-border bg-card p-3 shadow-soft"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: pos.rot }}
              transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon className="h-4 w-4 text-primary" />
              <p className="mt-2 text-small lowercase leading-snug">{beat.title.replace(".", "")}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-3">
        <Button
          variant="primaryLight"
          size="lg"
          className="w-full"
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
          className="press focus-ring mx-auto block rounded-control px-3 py-1.5 text-small text-muted-foreground"
        >
          {user ? "continue where you left off" : "already have an account? log in"}
        </button>
      </div>
    </div>
  );
}
