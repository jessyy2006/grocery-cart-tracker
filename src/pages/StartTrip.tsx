import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { beginTrip } from "@/lib/trip";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Trip bootstrapper. Reads the pending list id (if any) and forwards to the
 * live shopping page. All creation/resume logic lives in beginTrip().
 */
export default function StartTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const pendingList = sessionStorage.getItem("pendingTrip:listId");
        const listId = pendingList && pendingList !== "none" ? pendingList : null;
        await beginTrip(user.id, listId);
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
