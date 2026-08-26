import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SHOWCASE_BEATS } from "@/components/onboarding/demos";
import { ListChecks, Coins, ScanLine, Receipt, LineChart } from "lucide-react";

/**
 * Beat 0 — the hero. Per the frame: artwork fills the upper stage, the brand
 * name and its line sit centred beneath it, and the action is an auto-width
 * pill with a quiet text link under it. Nothing else.
 *
 * The five cards ring the title rather than sitting in a row, so the frame's
 * "key features circle the hero CTA" reads at a glance before the showcase
 * explains any of them.
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
      <div className="relative mt-4 flex-1">
        {SHOWCASE_BEATS.map((beat, i) => {
          const Icon = ICONS[i];
          const pos = RING[i];
          return (
            <motion.div
              key={beat.id}
              className="absolute w-[42%] rounded-card border border-border bg-card p-3 shadow-soft"
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

      <motion.div
        className="text-center"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-display">Cartwise</h1>
        <p className="mt-1.5 text-body text-muted-foreground">your grocery shopping hero</p>
      </motion.div>

      <div className="mt-10 flex flex-col items-center gap-3">
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
