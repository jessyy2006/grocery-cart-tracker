import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";

export const AppLayout = () => (
  <div className="flex min-h-dvh h-full flex-col bg-background overscroll-none">
    <main
      className="relative isolate flex-1 min-h-dvh overflow-y-auto overscroll-contain safe-top pb-28"
      style={{ overflowAnchor: "none" }}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </main>
    <BottomNav />
  </div>
);
