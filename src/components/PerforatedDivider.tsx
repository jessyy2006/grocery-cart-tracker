import { cn } from "@/lib/utils";

/** A dashed receipt-style perforation rule. */
export function PerforatedDivider({ className }: { className?: string }) {
  return <div role="separator" aria-hidden className={cn("perforation", className)} />;
}
