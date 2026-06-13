import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";

export const AppLayout = () => {
  const { pathname } = useLocation();
  const isListDetail = /^\/lists\/[^/]+$/.test(pathname);
  const fullscreen = pathname === "/trip" || pathname === "/trip/new" || pathname === "/scan-receipt" || isListDetail;
  const hideNav = fullscreen;

  return (
    <div className="flex min-h-dvh h-full flex-col bg-background overscroll-none">
      <main
        className={
          fullscreen
            ? "relative isolate flex-1 h-dvh overflow-hidden overscroll-contain"
            : `relative isolate flex-1 min-h-dvh overflow-y-auto overscroll-contain safe-top ${hideNav ? "" : "pb-14"}`
        }
        style={{ overflowAnchor: "none" }}
      >
        <PageTransition fullscreen={fullscreen}>
          <Outlet />
        </PageTransition>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
