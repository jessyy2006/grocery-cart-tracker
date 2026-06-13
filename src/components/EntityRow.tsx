import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The canonical presentation for a list/trip/entity (see DESIGN.md → Entity rows).
 * Flat, borderless, lowercase ruled rows — never cards. Wrap a set of rows in
 * <EntityList> to get the hairline dividers.
 */
export function EntityList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cn("divide-y divide-hairline", className)}>{children}</ul>;
}

type EntityRowProps = {
  /** Primary label — rendered lowercase. */
  name: string;
  /** Secondary metadata line (e.g. "12 items · updated 3d ago"). */
  meta?: ReactNode;
  /** Trailing content inside the tap target (e.g. <Money/> or a chevron). */
  trailing?: ReactNode;
  /** Action rendered outside the tap target (e.g. a ConfirmDialog delete trigger). */
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function EntityRow({
  name,
  meta,
  trailing,
  action,
  onClick,
  className,
}: EntityRowProps) {
  return (
    <li className="group relative">
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 py-4 text-left transition-opacity hover:opacity-70",
          action ? "pr-10" : "pr-1",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] lowercase text-foreground">
            {name.toLowerCase()}
          </span>
          {meta && (
            <span className="mt-0.5 block truncate lowercase text-muted-foreground">
              {meta}
            </span>
          )}
        </span>
        {trailing && <span className="shrink-0">{trailing}</span>}
      </button>
      {action && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">{action}</div>
      )}
    </li>
  );
}
