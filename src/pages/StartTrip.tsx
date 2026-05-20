import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Trip bootstrapper. No UI store selection — just create an active trip
 * (linked to a list if pending) and forward to the live shopping page.
 * Store can be added optionally from inside the live trip.
 */
export default function StartTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // If there's already an active trip, jump straight in.
        const { data: existing } = await supabase
          .from("trips")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        if (existing?.[0]) {
          sessionStorage.removeItem("pendingTrip:listId");
          sessionStorage.removeItem("trip:cameFromOnboarding");
          navigate("/trip", { replace: true });
          return;
        }

        const pendingList = sessionStorage.getItem("pendingTrip:listId");
        let listId = pendingList && pendingList !== "none" ? pendingList : null;

        // Free-shop mode: spin up a hidden backing list so items flow through
        // the normal planned/category UX instead of being flagged as extras.
        if (!listId) {
          const stamp = new Date().toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const { data: hl, error: hlErr } = await supabase
            .from("shopping_lists")
            .insert({ user_id: user.id, name: `Free trip · ${stamp}`, hidden: true })
            .select("id")
            .single();
          if (hlErr) throw hlErr;
          listId = hl.id;
        }

        const { data: trip, error } = await supabase
          .from("trips")
          .insert({ user_id: user.id, list_id: listId })
          .select("id")
          .single();
        if (error) throw error;
        sessionStorage.removeItem("pendingTrip:listId");
        sessionStorage.removeItem("trip:cameFromOnboarding");
        if (!cancelled) navigate("/trip", { replace: true });
      } catch (e: any) {
        toast.error(e.message ?? "Failed to start trip");
        if (!cancelled) navigate("/", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
