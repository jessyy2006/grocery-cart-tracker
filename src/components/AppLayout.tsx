import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";

export const AppLayout = () => {
  const { pathname } = useLocation();
  const fullscreen = pathname === "/trip" || pathname === "/trip/new";

  return (
    <div className="flex min-h-dvh h-full flex-col bg-background overscroll-none">
      <main
        className={
          fullscreen
            ? "relative isolate flex-1 h-dvh overflow-hidden overscroll-contain"
            : "relative isolate flex-1 min-h-dvh overflow-y-auto overscroll-contain safe-top pb-28"
        }
        style={{ overflowAnchor: "none" }}
      >
        <PageTransition fullscreen={fullscreen}>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
    </div>
  );
};
