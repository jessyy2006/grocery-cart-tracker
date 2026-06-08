import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { motion, useReducedMotion, HTMLMotionProps } from "framer-motion";

interface FABProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  label: string;
  icon?: React.ReactNode;
  /** Lift the FAB above the floating bottom nav (default true) */
  liftAboveNav?: boolean;
  /** Horizontal placement: 'right' (default) or 'center' */
  position?: "right" | "center";
}

export const FloatingActionButton = forwardRef<HTMLButtonElement, FABProps>(
  ({ label, icon, className, liftAboveNav = true, position = "right", ...props }, ref) => {
    const reduce = useReducedMotion();
    return (
      <div
        className={cn(
          "fixed z-20 pointer-events-none",
          position === "center" ? "left-0 right-0 flex justify-center" : "right-5",
          liftAboveNav ? "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]" : "bottom-6",
        )}
      >
        <motion.button
          ref={ref}
          initial={reduce ? { opacity: 0 } : { scale: 0, rotate: -8, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          whileHover={reduce ? undefined : { y: -2 }}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          {...props}
          className={cn(
            "pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 h-14 text-[15px] font-semibold shadow-raised hover:shadow-glow",
            className,
          )}
        >
          {icon ?? <Plus className="h-5 w-5" strokeWidth={2.25} />}
          <span>{label}</span>
        </motion.button>
      </div>
    );
  },
);
FloatingActionButton.displayName = "FloatingActionButton";
