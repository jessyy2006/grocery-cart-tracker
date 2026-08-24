import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Secondary line under the title (e.g. "12 items"). */
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * The single page title treatment (see DESIGN.md → Page shell).
 * Display serif, lowercase, left-aligned, with an optional trailing action.
 * Every route uses this — no page hand-rolls its own <h1>.
 */
export function PageHeader({ eyebrow, title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-display lowercase leading-[1.25] pb-1 truncate">{title}</h1>
        {subtitle && <p className="text-small text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="mb-2 shrink-0">{action}</div>}
    </header>
  );
}
