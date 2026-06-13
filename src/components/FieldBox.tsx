import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The canonical labelled input box (see DESIGN.md → Inputs). A bordered
 * `rounded-card` box with a mono uppercase micro-label inside, above a
 * borderless control. Matches the list-creation add-item pad so every
 * item-entry surface (add pad, edit, live-run add/check-off) reads the same.
 */
export function FieldBox({
  label,
  labelRight,
  className,
  children,
}: {
  label: string;
  labelRight?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-card border border-hairline px-3 py-2", className)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {labelRight}
      </div>
      {children}
    </div>
  );
}

/** Shared borderless control styling for inputs that live inside a FieldBox. */
export const fieldInputClass =
  "mt-0.5 h-7 w-full border-0 bg-transparent px-0 py-0 text-[15px] focus-visible:ring-0";
