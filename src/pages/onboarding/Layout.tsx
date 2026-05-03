import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 7;

type Props = {
  step: number;
  title?: string;
  subtitle?: string;
  skipTo?: string;
  onSkip?: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
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
  children,
}: Props) {
  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-6">
      <div className="relative flex items-center">
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
        {(skipTo || onSkip) && (
          skipTo ? (
            <Link to={skipTo} className="absolute -top-1 right-0 -translate-y-full text-sm text-muted-foreground hover:text-foreground">
              Skip
            </Link>
          ) : (
            <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
              Skip
            </button>
          )
        )}
      </div>

      {(title || subtitle) && (
        <header className="mt-8">
          {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </header>
      )}

      <div className="flex-1 py-8">{children}</div>

      {onPrimary && (
        <Button size="lg" className="w-full" onClick={onPrimary} disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}
