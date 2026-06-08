import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  /** Lift the FAB above the floating bottom nav (default true) */
  liftAboveNav?: boolean;
}

export const FloatingActionButton = forwardRef<HTMLButtonElement, FABProps>(
  ({ label, icon, className, liftAboveNav = true, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        "fixed right-5 z-20 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 h-14 text-[15px] font-semibold shadow-raised hover:shadow-glow hover:-translate-y-[1px] active:scale-[0.98] transition-all",
        liftAboveNav ? "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]" : "bottom-6",
        className,
      )}
    >
      {icon ?? <Plus className="h-5 w-5" strokeWidth={2.25} />}
      <span>{label}</span>
    </button>
  ),
);
FloatingActionButton.displayName = "FloatingActionButton";
