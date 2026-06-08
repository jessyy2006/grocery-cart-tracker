import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ListChecks, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { formatDistanceToNow } from "date-fns";

type ShoppingList = {
  id: string;
  name: string;
  updated_at: string;
  shopping_list_items: { id: string; checked_at: string | null }[];
};

export default function Lists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("shopping_lists")
      .select("id, name, updated_at, shopping_list_items(id, checked_at)")
      .eq("hidden", false)
      .order("updated_at", { ascending: false });
    setLists((data as any) ?? []);
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

  return (
    <div className="space-y-7 px-5 pt-3">
      <PageHeader eyebrow="Plan your run" title="Your lists" />

      {lists.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/60">
            <ListChecks className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <p className="mt-4 text-h2">No lists yet</p>
          <p className="mt-1 text-small text-muted-foreground max-w-[26ch]">
            Build a list to plan your next market run.
          </p>
          <Button variant="hero" size="lg" className="mt-5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New list
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lists.map((l) => {
            const total = l.shopping_list_items?.length ?? 0;
            const done = l.shopping_list_items?.filter((i) => i.checked_at).length ?? 0;
            return (
              <li key={l.id}>
                <Card className="group relative overflow-hidden">
                  <button
                    onClick={() => navigate(`/lists/${l.id}`)}
                    className="flex w-full items-center gap-3 p-5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-eyebrow">
                        {total === 0 ? "Empty list" : `${total} item${total === 1 ? "" : "s"}`}
                        {total > 0 && ` · ${done} picked`}
                      </p>
                      <p className="mt-1 text-h2 truncate">{l.name}</p>
                      <p className="mt-1 text-small text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(l.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="absolute right-3 top-3 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete list"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {lists.length > 0 && (
        <FloatingActionButton label="New list" onClick={() => setOpen(true)} />
      )}

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
