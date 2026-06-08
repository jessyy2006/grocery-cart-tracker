import { motion, useReducedMotion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

type TapCardProps = HTMLMotionProps<"button">;

export const TapCard = forwardRef<HTMLButtonElement, TapCardProps>((props, ref) => {
  const reduce = useReducedMotion();
  return (
    <motion.button
      ref={ref}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
    />
  );
});
TapCard.displayName = "TapCard";
