import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export const AppLayout = () => (
  <div className="flex min-h-dvh h-full flex-col bg-background overscroll-none">
    <main className="flex-1 overflow-y-auto overscroll-contain safe-top pb-28">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);
