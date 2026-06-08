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
import { Switch } from "@/components/ui/switch";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES, useCurrency, setCurrency, Currency } from "@/lib/format";
import { useDuplicateAlerts, setDuplicateAlerts } from "@/lib/prefs";

type Store = { id: string; name: string; address: string | null };

export default function Profile() {
  const { user } = useAuth();
  const { firstName, loading: profileLoading } = useProfile();
  const currency = useCurrency();
  const [stores, setStores] = useState<Store[]>([]);
  const dupAlerts = useDuplicateAlerts();

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
    <div className="space-y-7 px-5 pt-3">
      <header>
        <p className="text-eyebrow">Your account</p>
        <h1 className="mt-1.5 text-h1">
          {profileLoading ? (
            <span className="invisible">Profile</span>
          ) : firstName ? (
            `${firstName}`
          ) : (
            "Profile"
          )}
        </h1>
        <p className="mt-1 text-small text-muted-foreground">{user?.email}</p>
      </header>

      <section className="space-y-3">
        <p className="text-eyebrow">Currency</p>
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-h3">Display currency</p>
            <p className="text-small text-muted-foreground">Used for all prices and totals.</p>
          </div>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="h-10 w-28 rounded-md bg-surface border-hairline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </section>

      <section className="space-y-3">
        <p className="text-eyebrow">Preferences</p>
        <Card className="flex items-center justify-between p-4">
          <div className="pr-3">
            <p className="text-h3">Duplicate item alerts</p>
            <p className="text-small text-muted-foreground">Warn me before adding duplicate items.</p>
          </div>
          <Switch checked={dupAlerts} onCheckedChange={setDuplicateAlerts} />
        </Card>
      </section>

      <section className="space-y-3">
        <p className="text-eyebrow">My stores</p>
        {stores.length === 0 ? (
          <Card className="p-5">
            <p className="text-small text-muted-foreground">
              Stores you've shopped at will appear here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {stores.map((s) => (
              <li key={s.id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-h3">{s.name}</p>
                    {s.address && <p className="text-small text-muted-foreground">{s.address}</p>}
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

      <Button variant="outline" size="lg" className="w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
