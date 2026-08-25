import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the three signup steps (name, code, budget).
 *
 * The "grey caption shrinks and lifts above the headline" entrance only plays
 * the first time the user enters the signup half — stepping between screens
 * afterwards keeps the header perfectly still, so only the body content moves.
 */
let introPlayed = false;

type Props = {
  caption: string;
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
};

export function SignupShell({ caption, title, onBack, children, footer, className }: Props) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  // Captured once per mount so a re-render mid-animation can't restart it.
  const playIntro = useRef(!introPlayed && !reduce);
  if (playIntro.current) introPlayed = true;

  return (
    <div className="flex min-h-full flex-col bg-background px-5 pb-6 safe-top-page safe-bottom">
      <div className="h-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            aria-label="Back"
            className="press focus-ring -ml-2 flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <motion.p
        className="text-eyebrow"
        initial={playIntro.current ? { opacity: 0, y: 18, scale: 1.35 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left center" }}
      >
        {caption}
      </motion.p>

      <motion.h1
        className="text-display mt-1.5 lowercase"
        initial={playIntro.current ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {title}
      </motion.h1>

      <motion.div
        className={cn("mt-8 flex-1", className)}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: playIntro.current ? 0.24 : 0.04, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      <div className="mt-6 space-y-3">{footer}</div>
    </div>
  );
}
