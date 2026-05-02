import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export const AppLayout = () => (
  <div className="flex h-full flex-col bg-background">
    <main className="flex-1 overflow-y-auto safe-top">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);
