import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
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

  const ctaClasses =
    "h-12 w-full rounded-[4px] bg-forest text-forest-foreground text-[14px] lowercase tracking-tight transition-opacity hover:opacity-90";

  return (
    <div className="space-y-7 px-5 pt-3 pb-8">
      <PageHeader
        eyebrow="plan your run"
        title="your lists"
        className="[&_h1]:text-display [&_h1]:lowercase [&_.text-eyebrow]:font-mono [&_.text-eyebrow]:normal-case [&_.text-eyebrow]:tracking-[0.14em] [&_.text-eyebrow]:font-normal"
      />

      {!ready ? (
        <MarketLoader minHeight="55vh" />
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-display text-[1.5rem] lowercase tracking-tight">no lists yet</p>
          <p className="mt-2 font-mono text-[12px] lowercase text-muted-foreground max-w-[28ch]">
            build a list to plan your next market run.
          </p>
          <button onClick={() => setOpen(true)} className={`${ctaClasses} mt-8 max-w-xs`}>
            [ + create a new list ]
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-foreground/10">
            {lists.map((l) => {
              const total = l.shopping_list_items?.length ?? 0;
              const sub = `→ ${total} item${total === 1 ? "" : "s"} · updated ${formatDistanceToNow(new Date(l.updated_at), { addSuffix: true })}`.toLowerCase();
              return (
                <li key={l.id} className="group relative">
                  <button
                    onClick={() => navigate(`/lists/${l.id}`)}
                    className="flex w-full flex-col items-start gap-0.5 py-5 pr-10 text-left transition-opacity hover:opacity-70"
                  >
                    <p className="text-[15px] lowercase text-foreground truncate max-w-full">
                      {l.name.toLowerCase()}
                    </p>
                    <p className="font-mono text-[12px] lowercase text-muted-foreground truncate max-w-full">
                      {sub}
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

          <button onClick={() => setOpen(true)} className={ctaClasses}>
            [ + create a new list ]
          </button>
        </>
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
