import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { PropsWithChildren } from "react";

export const PageTransition = ({ children }: PropsWithChildren) => {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={
          reduce
            ? { duration: 0.12, ease: "easeOut" }
            : {
                opacity: { duration: 0.18, ease: "easeOut" },
                y: { type: "spring", stiffness: 380, damping: 34, mass: 0.7 },
              }
        }
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
