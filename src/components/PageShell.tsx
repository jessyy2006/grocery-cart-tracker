import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  /** Adds the standard section rhythm between direct children. */
  stack?: boolean;
  className?: string;
}

/**
 * Canonical page container (see DESIGN.md → Page shell): one horizontal
 * gutter, one top offset below the safe area, one section rhythm. Pages must
 * not set their own `px-*` / `pt-*` on the outermost element.
 */
export function PageShell({ stack = true, className, children }: PropsWithChildren<PageShellProps>) {
  return (
    <div className={cn("page-gutter safe-top-page pb-12", className)}>
      <div className={stack ? "section-stack" : undefined}>{children}</div>
    </div>
  );
}
