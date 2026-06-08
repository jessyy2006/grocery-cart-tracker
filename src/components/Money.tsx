import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

interface MoneyProps {
  cents: number;
  className?: string;
  /** display size */
  size?: "sm" | "md" | "lg" | "xl" | "display";
  muted?: boolean;
}

const sizes: Record<NonNullable<MoneyProps["size"]>, string> = {
  sm: "text-[13px]",
  md: "text-[15px]",
  lg: "text-xl",
  xl: "text-3xl",
  display: "text-[44px] leading-[1.05]",
};

export function Money({ cents, className, size = "md", muted }: MoneyProps) {
  return (
    <span
      className={cn(
        "text-money",
        sizes[size],
        muted ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      {formatMoney(cents)}
    </span>
  );
}
