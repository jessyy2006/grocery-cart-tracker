import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  /** Optional retry handler — renders the primary "try again" action. */
  onRetry?: () => void;
  retryLabel?: string;
  /** `page` = full blank screen, `section` = tighter, inside a populated page. */
  size?: "page" | "section";
  className?: string;
};

/**
 * The single failure treatment (see DESIGN.md → Empty / loading / error states).
 * Mirrors `EmptyState` so a failed load reads as a state, not a broken screen.
 */
export function ErrorState({
  title = "couldn't load this",
  description = "Something went wrong on our end. Check your connection and try again.",
  onRetry,
  retryLabel = "try again",
  size = "page",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "page" ? "py-16" : "py-8",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-h3 lowercase">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[32ch] text-small text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button variant="primaryLight" size="lg" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
