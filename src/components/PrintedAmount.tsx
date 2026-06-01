import { formatMoney, type Currency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "default" | "destructive" | "success" | "warning" | "muted";

type Props = {
  /** amount in cents */
  cents: number;
  currency?: Currency;
  /** status color */
  tone?: Tone;
  className?: string;
};

const TONE: Record<Tone, string> = {
  default: "",
  destructive: "text-destructive",
  success: "text-success",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

/**
 * Money, rendered like printed receipt ink: monospace + tabular figures so
 * digits align and totals read as "printed". Use everywhere money appears.
 */
export function PrintedAmount({ cents, currency, tone = "default", className }: Props) {
  return (
    <span className={cn("font-mono tabular-nums tracking-tight", TONE[tone], className)}>
      {formatMoney(cents, currency)}
    </span>
  );
}
