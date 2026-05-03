import { NavLink } from "react-router-dom";
import { Home, ListChecks, ShoppingCart, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/lists", label: "Lists", icon: ListChecks },
  { to: "/trip", label: "Trip", icon: ShoppingCart },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => (
  <nav className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom">
    <ul className="grid grid-cols-5 px-2 py-2">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to} className="flex justify-center">
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex w-full max-w-[72px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-accent/30 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
