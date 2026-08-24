import type { Transition } from "framer-motion";

/**
 * Single source of truth for motion (see DESIGN.md → Motion).
 * Durations mirror the `--motion-*` CSS tokens; springs are shared so that
 * page transitions, sheets and swipe rows all settle with the same feel.
 */
export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.26,
} as const;

/** The one spring used for anything that travels (sheets, rows, drags). */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

/** Opacity-only fade, matched to `--motion-base`. */
export const FADE: Transition = { duration: DURATION.base, ease: "easeOut" };

/** Reduced-motion replacement for any of the above. */
export const REDUCED: Transition = { duration: DURATION.fast, ease: "easeOut" };

export const transition = (reduce: boolean | null, t: Transition = FADE): Transition =>
  reduce ? REDUCED : t;

/** Tailwind recipe for a tappable surface: shared press scale + focus ring. */
export const TAPPABLE = "press focus-ring";
