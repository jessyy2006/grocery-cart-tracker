import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageLoadGate } from "@/components/PageLoadGate";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { formatListTimestamp } from "@/lib/format";

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
      <PageLoadGate ready={ready}>
        {/* Header */}
        <header className="flex items-end justify-between gap-3 pt-2 pb-2">
          <div className="min-w-0">
            <p className="text-eyebrow mb-1.5">plan your run</p>
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
          {lists.length === 0 ? (
          <EmptyState
            title="no lists yet"
            description='Tap "+ new list" to plan your next market run.'
          />
        ) : (

          <ul className="divide-y divide-dashed divide-foreground/10">
            {lists.map((l) => {
              const total = l.shopping_list_items?.length ?? 0;
              const sub = `${formatListTimestamp(l.updated_at)} · ${total} item${total === 1 ? "" : "s"}`;
              return (
                <li key={l.id} className="group relative">
                  <button
                    onClick={() => navigate(`/lists/${l.id}`)}
                    className="flex w-full items-center justify-between gap-4 py-5 pr-10 text-left transition-opacity hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-normal lowercase text-foreground">
                        {l.name.toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-[13px] lowercase text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <ConfirmDialog
                      title="Delete this list?"
                      description={`"${l.name.toLowerCase()}" and everything in it will be removed. This can't be undone.`}
                      confirmLabel="Delete list"
                      onConfirm={() => remove(l.id)}
                      trigger={
                        <button
                          className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </PageLoadGate>

    </div>
  );
}
