import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, ShoppingCart, Play } from "lucide-react";

type ShortList = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Single entry point UI for starting a shopping trip. */
export function StartTripSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ShortList[]>([]);
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: ls }, { data: active }] = await Promise.all([
        supabase
          .from("shopping_lists")
          .select("id, name")
          .eq("hidden", false)
          .order("updated_at", { ascending: false }),
        supabase.from("trips").select("id").eq("status", "active").limit(1),
      ]);
      setLists(ls ?? []);
      setHasActive(!!active?.[0]);
    })();
  }, [open]);

  const start = (listId: string | null) => {
    sessionStorage.setItem("pendingTrip:listId", listId ?? "none");
    onOpenChange(false);
    navigate("/trip/new");
  };

  const resume = () => {
    onOpenChange(false);
    navigate("/trip");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start shopping</DialogTitle>
          <DialogDescription>Shop with one of your lists, or without one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {hasActive && (
            <Button className="w-full" size="lg" onClick={resume}>
              <Play className="mr-2 h-4 w-4" /> Resume current trip
            </Button>
          )}
          {lists.length > 0 && (
            <ScrollArea className="max-h-[50vh] pr-2">
              <ul className="space-y-2">
                {lists.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => start(l.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary"
                    >
                      <ListChecks className="h-5 w-5 text-primary" />
                      <span className="font-medium">{l.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
          <Button variant="outline" className="w-full" onClick={() => start(null)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Shop without a list
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
