import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionRowProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  /** "check" = multi-select (rounded square), "radio" = single-select (circle). */
  indicator?: "check" | "radio";
};

/**
 * Canonical selectable option row for forms/onboarding (see DESIGN.md →
 * Inputs & selection controls). Full-width bordered row with a consistent
 * selection indicator and the brand `primary` accent.
 */
export function OptionRow({ label, active, onClick, indicator = "check" }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-card border p-4 text-left font-medium transition",
        active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center border transition",
          indicator === "radio" ? "rounded-full" : "rounded-control",
          active ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {active && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}
