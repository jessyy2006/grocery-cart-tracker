import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BackHeaderProps {
  title?: string;
  /** Where to go back to. Defaults to browser history. */
  to?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Header for detail routes that are not tab destinations (profile, trip
 * detail). Pairs with the `detail` layout in AppLayout, which hides the tab
 * bar so the back affordance is the only way out.
 */
export function BackHeader({ title, to, action, className }: BackHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <button
        type="button"
        aria-label="Back"
        onClick={() => (to ? navigate(to) : navigate(-1))}
        className="press focus-ring -ml-2 flex h-11 w-11 items-center justify-center rounded-control text-foreground"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {title && <span className="text-eyebrow truncate">{title}</span>}
      <div className="flex h-11 min-w-11 items-center justify-end">{action}</div>
    </header>
  );
}
