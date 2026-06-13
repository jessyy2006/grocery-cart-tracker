import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "HOME", end: true },
  { to: "/lists", label: "LISTS" },
  { to: "/finance", label: "FINANCE" },
  { to: "/history", label: "HISTORY" },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  if (pathname === "/trip" || pathname === "/trip/new" || pathname === "/scan-receipt") return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* 48px binder area */}
      <div className="relative h-12 w-full">
        {/* Boundary stroke — sits 4px from top of container, above the 44px tab row */}
        <div
          className="absolute left-0 right-0 top-1 h-px bg-[#E5DFD3]"
          aria-hidden
        />
        {/* Tabs grid */}
        <div className="absolute inset-x-0 bottom-0 top-0 grid grid-cols-4 items-end px-3 gap-2">
          {items.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center justify-center font-mono uppercase tracking-widest text-[9px] py-2 transition-transform",
                  "rounded-t-[4px]",
                  isActive
                    ? "z-10 h-11 -mb-0 bg-[#143F2D] text-[#F7F5F0] font-bold"
                    : "h-10 bg-white text-[#7C756B] border border-b-0 border-[#E5DFD3] hover:-translate-y-0.5",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};
