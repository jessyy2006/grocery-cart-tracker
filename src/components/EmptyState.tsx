import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional CTA (e.g. a <Button>). */
  action?: ReactNode;
  className?: string;
};

/**
 * The single empty-state treatment (see DESIGN.md → Empty / loading states).
 * Centered, lowercase, optional icon + CTA. Replaces the per-screen variants.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      {Icon && <Icon className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />}
      <p className="text-h3 lowercase">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[32ch] text-small text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
