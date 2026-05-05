import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES, useCurrency, setCurrency, Currency } from "@/lib/format";

type Store = { id: string; name: string; address: string | null };

export default function Profile() {
  const { user } = useAuth();
  const { firstName, loading: profileLoading } = useProfile();
  const currency = useCurrency();
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
    <div className="space-y-6 px-5 pb-6 pt-2">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {profileLoading ? (
            <span className="invisible">Profile</span>
          ) : firstName ? (
            `${firstName}'s Profile`
          ) : (
            "Profile"
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Currency
        </h2>
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Display currency</p>
            <p className="text-xs text-muted-foreground">Used for all prices and totals.</p>
          </div>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </section>

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
