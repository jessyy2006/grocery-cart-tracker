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
  const { pathname } = useLocation();
  if (pathname === "/trip" || pathname === "/trip/new" || pathname === "/scan-receipt") return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-6"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto mx-auto grid max-w-[420px] grid-cols-4 rounded-[22px] border border-hairline bg-surface-raised/80 px-1 py-1.5 shadow-soft"


        style={{
          backdropFilter: "saturate(140%) blur(18px)",
          WebkitBackdropFilter: "saturate(140%) blur(18px)",
        }}
      >
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 rounded-[16px] py-1.5 transition-colors",
                "active:scale-95 motion-reduce:active:scale-100 transition-transform",
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
