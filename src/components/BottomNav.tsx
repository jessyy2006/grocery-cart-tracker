import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ListChecks, BarChart3, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/lists", label: "Lists", icon: ListChecks },
  { to: "/finance", label: "Finance", icon: BarChart3 },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  if (pathname === "/trip" || pathname === "/trip/new") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <nav className="pointer-events-auto glass shadow-raised border border-hairline rounded-full px-2 py-1.5">
        <ul className="flex items-center gap-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-11 w-12 items-center justify-center rounded-full text-xs font-medium transition-colors active:scale-[0.92] [transition:transform_120ms_ease-out,color_180ms_ease-out]",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-primary shadow-soft"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    <Icon className="relative h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
