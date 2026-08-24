import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single in-flight indicator for work inside a surface (buttons, search,
 * capture). Route-level loading uses PageLoadGate, which renders this same
 * spinner after its grace period.
 */
export function Spinner({
  className,
  size = "sm",
  label = "Loading",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const dim = size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <Loader2
      role="status"
      aria-label={label}
      strokeWidth={1.75}
      className={cn("animate-spin text-current", dim, className)}
    />
  );
}
