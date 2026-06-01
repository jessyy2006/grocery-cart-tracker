import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

type Props = {
  step: number;
  title?: string;
  subtitle?: string;
  skipTo?: string;
  onSkip?: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

export default function OnboardingLayout({
  step,
  title,
  subtitle,
  skipTo,
  onSkip,
  primaryLabel = "Continue",
  onPrimary,
  primaryDisabled,
  footer,
  children,
}: Props) {
  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-2 safe-top safe-bottom">
      <div className="pt-6">
        <div className="flex w-full gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
        <div className="mt-2 flex h-5 items-center justify-end">
          {(skipTo || onSkip) && (
            skipTo ? (
              <Link to={skipTo} className="text-sm text-muted-foreground hover:text-foreground">
                Skip
              </Link>
            ) : (
              <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
                Skip
              </button>
            )
          )}
        </div>
      </div>

      {(title || subtitle) && (
        <header className="mt-6">
          {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </header>
      )}

      <div className="flex-1 py-8">{children}</div>

      {footer && <div className="mb-3">{footer}</div>}

      {onPrimary && (
        <Button size="lg" className="w-full" onClick={onPrimary} disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}
