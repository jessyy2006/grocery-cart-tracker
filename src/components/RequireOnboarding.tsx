import { Navigate, useLocation } from "react-router-dom";
import { safeGetItem, safeSetItem } from "@/lib/native";
import { useAuth } from "@/hooks/useAuth";
import { ONBOARDED_KEY } from "@/hooks/useOnboarding";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHECK_TIMEOUT = 8_000;

type OnboardingRow = { completed_at?: string | null };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export const RequireOnboarding = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "ok" | "needs" | "error">("checking");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (safeGetItem(ONBOARDED_KEY) === "1") {
      setStatus("ok");
      return;
    }
    let done = false;
    (async () => {
      try {
        const { data } = await withTimeout(
          (supabase as any)
            .from("user_onboarding")
            .select("completed_at")
            .eq("user_id", user.id)
            .maybeSingle() as Promise<{ data: OnboardingRow | null }>,
          CHECK_TIMEOUT,
        );
        if (done) return;
        if (data?.completed_at) {
          safeSetItem(ONBOARDED_KEY, "1");
          setStatus("ok");
        } else {
          setStatus("needs");
        }
      } catch {
        if (!done) setStatus("error");
      }
    })();
    return () => {
      done = true;
    };
  }, [user]);

  if (!user) return children; // RequireAuth handles auth redirect
  if (status === "checking")
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;
  if (status === "error")
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  if (status === "needs")
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  return children;
};
