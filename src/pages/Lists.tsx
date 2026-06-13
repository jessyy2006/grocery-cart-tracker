import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MarketLoader } from "@/components/MarketLoader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  const [creating, setCreating] = useState(false);

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
    if (!user || creating) return;
    setCreating(true);
    const defaultName = `List ${lists.length + 1}`;
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({ user_id: user.id, name: defaultName })
      .select("id")
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    navigate(`/lists/${data!.id}`);
  };

  const remove = async (id: string) => {
    const prev = lists;
    setLists((c) => c.filter((l) => l.id !== id));
    const { error } = await supabase.from("shopping_lists").delete().eq("id", id);
    if (error) {
      setLists(prev);
      toast.error("Couldn't delete the list");
    }
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
        <Button
          variant="primaryLight"
          size="compact"
          onClick={create}
          disabled={creating}
          className="mb-2 whitespace-nowrap"
        >
          + new list
        </Button>
      </header>

      {/* Notebook margin rule */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[7rem] bottom-0"
        style={{
          left: `${MARGIN_LEFT}px`,
          width: "1px",
          backgroundColor: "hsl(20 40% 18% / 0.85)",
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
                  <ConfirmDialog
                    title="Delete this list?"
                    description={`"${l.name.toLowerCase()}" and everything in it will be removed. This can't be undone.`}
                    confirmLabel="Delete list"
                    onConfirm={() => remove(l.id)}
                    trigger={
                      <button
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete list"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
