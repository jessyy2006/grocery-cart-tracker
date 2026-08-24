import { NavLink, useLocation } from "react-router-dom";
import { Clock, Home, ListChecks, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "HOME", icon: Home, end: true },
  { to: "/lists", label: "LISTS", icon: ListChecks },
  { to: "/finance", label: "FINANCE", icon: Wallet },
  { to: "/history", label: "HISTORY", icon: Clock },
];

/**
 * iOS-style floating tab bar: a frosted, rounded bar hovering above the
 * home-indicator safe area with icon + label tabs.
 */
export const BottomNav = () => {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-6"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <nav
        aria-label="Primary"
        className="glass pointer-events-auto mx-auto grid max-w-[420px] grid-cols-4 rounded-sheet border border-hairline px-1 py-1.5 shadow-soft"
      >
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "press focus-ring flex flex-col items-center justify-center gap-1 rounded-card py-1.5",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-widest",
                    isActive && "font-bold",
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
