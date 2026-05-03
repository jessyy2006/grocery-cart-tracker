import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ONBOARDED_KEY } from "@/hooks/useOnboarding";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const RequireOnboarding = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "ok" | "needs">("checking");

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(ONBOARDED_KEY) === "1") {
      setStatus("ok");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.completed_at) {
        localStorage.setItem(ONBOARDED_KEY, "1");
        setStatus("ok");
      } else {
        setStatus("needs");
      }
    })();
  }, [user]);

  if (!user) return children; // RequireAuth handles auth redirect
  if (status === "checking")
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;
  if (status === "needs")
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  return children;
};
