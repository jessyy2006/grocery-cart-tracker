import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MarketLoader } from "@/components/MarketLoader";
import { formatDistanceToNow } from "date-fns";

type ShoppingList = {
  id: string;
  name: string;
  updated_at: string;
  shopping_list_items: { id: string }[];
};

export default function Lists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("shopping_lists")
      .select("id, name, updated_at, shopping_list_items(id)")
      .eq("hidden", false)
      .order("updated_at", { ascending: false });
    setLists((data as any) ?? []);
    setReady(true);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({ user_id: user.id, name: name.trim() })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setOpen(false);
    setName("");
    navigate(`/lists/${data!.id}`);
  };

  const remove = async (id: string) => {
    setLists((c) => c.filter((l) => l.id !== id));
    await supabase.from("shopping_lists").delete().eq("id", id);
  };

  // Margin rule positioned ~48px from page left edge. Page has px-5 (20px),
  // so within our container offset is 48 - 20 = 28px.
  const MARGIN_LEFT = 28;

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] px-5 pt-3 pb-12">
      {/* Header */}
      <header className="flex items-end justify-between gap-3 pt-2 pb-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] lowercase tracking-[0.14em] text-muted-foreground mb-1.5">
            plan your run
          </p>
          <h1 className="font-display text-[2.25rem] leading-[1.25] lowercase tracking-tight pb-1">
            your lists
          </h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="font-mono text-[12px] lowercase tracking-tight text-forest hover:opacity-70 transition-opacity whitespace-nowrap pb-2"
        >
          + new list
        </button>
      </header>

      {/* Notebook margin rule */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[7rem] bottom-0"
        style={{
          left: `${MARGIN_LEFT}px`,
          width: "1px",
          backgroundColor: "hsl(18 35% 70% / 0.45)",
        }}
      />

      <div style={{ paddingLeft: `${MARGIN_LEFT + 16}px` }}>
        {!ready ? (
          <MarketLoader minHeight="55vh" />
        ) : lists.length === 0 ? (
          <div className="py-16 text-left">
            <p className="font-display text-[1.5rem] lowercase tracking-tight">no lists yet</p>
            <p className="mt-2 font-mono text-[12px] lowercase text-muted-foreground max-w-[28ch]">
              tap "+ new list" to plan your next market run.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {lists.map((l) => {
              const total = l.shopping_list_items?.length ?? 0;
              const updated = formatDistanceToNow(new Date(l.updated_at), { addSuffix: true });
              return (
                <li key={l.id} className="group relative">
                  <button
                    onClick={() => navigate(`/lists/${l.id}`)}
                    className="flex w-full flex-col items-start gap-1 py-6 pr-10 text-left transition-opacity hover:opacity-70"
                  >
                    <p className="text-[15px] lowercase text-foreground truncate max-w-full">
                      {l.name.toLowerCase()}
                    </p>
                    <p className="lowercase text-muted-foreground truncate max-w-full">
                      <span className="font-display italic text-[13px]">
                        {total} item{total === 1 ? "" : "s"}
                      </span>
                      <span className="font-mono text-[12px]"> · updated {updated}</span>
                    </p>
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete list"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl border-hairline">
          <DialogHeader>
            <DialogTitle className="text-h1">New shopping list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="e.g. Weekly groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <Button variant="hero" size="lg" className="w-full" onClick={create} disabled={!name.trim()}>
              Create list
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
