import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { useActiveTripRedirect } from "@/hooks/useActiveTrip";

/** Fullscreen routes: own their chrome edge-to-edge, no tab bar. */
const FULLSCREEN = ["/trip", "/trip/new", "/scan-receipt"];
/** Detail routes: standard page shell + back header, no tab bar. */
const DETAIL = ["/profile"];

const isListDetail = (p: string) => /^\/lists\/[^/]+$/.test(p);
const isTripDetail = (p: string) => /^\/trip\/[^/]+$/.test(p);

export const AppLayout = () => {
  const { pathname } = useLocation();
  useActiveTripRedirect();

  const fullscreen = FULLSCREEN.includes(pathname) || isListDetail(pathname);
  const detail = DETAIL.includes(pathname) || isTripDetail(pathname);
  const hideNav = fullscreen || detail;

  return (
    <div className="flex min-h-dvh h-full flex-col bg-background overscroll-none">
      <main
        className={
          fullscreen
            ? "relative isolate flex-1 h-dvh overflow-hidden overscroll-contain"
            : "relative isolate flex-1 min-h-dvh overflow-y-auto overscroll-contain"
        }
        style={{
          overflowAnchor: "none",
          paddingBottom: fullscreen || hideNav ? undefined : "var(--nav-clearance)",
        }}
      >
        <PageTransition fullscreen={fullscreen}>
          <Outlet />
        </PageTransition>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
