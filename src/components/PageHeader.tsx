import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, action, className }: PageHeaderProps) {
  return (
    <header className={cn("flex items-end justify-between gap-3 pt-2", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-h1 truncate">{title}</h1>
      </div>
      {action}
    </header>
  );
}
