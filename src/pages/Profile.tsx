import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Store = { id: string; name: string; address: string | null };

export default function Profile() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);

  const load = async () => {
    const { data } = await supabase.from("stores").select("id, name, address").order("name");
    setStores(data ?? []);
  };
  useEffect(() => {
    if (user) load();
  }, [user]);

  const removeStore = async (id: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-6 px-5 pb-3 pt-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">My stores</h2>
        {stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Stores you've shopped at will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {stores.map((s) => (
              <li key={s.id}>
                <Card className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                  </div>
                  <button
                    onClick={() => removeStore(s.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
