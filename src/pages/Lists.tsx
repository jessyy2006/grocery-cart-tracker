import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
      .order("updated_at", { ascending: false });
    setLists((data as any) ?? []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

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
    <div className="space-y-6 px-5 pb-8 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Plan your run</p>
          <h1 className="text-3xl font-bold tracking-tight">Shopping lists</h1>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </header>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <ListChecks className="mb-3 h-10 w-10 text-primary" />
          <p className="font-medium text-foreground">No lists yet</p>
          <p className="mt-1 text-sm">Create one to plan a grocery run.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => {
            const total = l.shopping_list_items?.length ?? 0;
            const done = l.shopping_list_items?.filter((i) => i.checked_at).length ?? 0;
            return (
              <li key={l.id}>
                <Card className="flex items-center justify-between p-4">
                  <button onClick={() => navigate(`/lists/${l.id}`)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {done}/{total} picked up
                    </p>
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="ml-2 text-muted-foreground hover:text-destructive"
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New shopping list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="e.g. Weekly groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <Button className="w-full" onClick={create} disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
