import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES, useCurrency, setCurrency, Currency } from "@/lib/format";
import { useDuplicateAlerts, setDuplicateAlerts } from "@/lib/prefs";

type Store = { id: string; name: string; address: string | null };

const sectionLabel = "text-eyebrow";
const rowDivider = "border-t border-hairline";

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
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6">
        <header className="mb-8">
          <p className={sectionLabel}>Your account</p>
          <h1 className="mt-1 text-h1">
            {profileLoading ? (
              <span className="invisible">Profile</span>
            ) : firstName ? (
              firstName
            ) : (
              "Profile"
            )}
          </h1>
          <p className="mt-1 text-small text-muted-foreground">{user?.email}</p>
        </header>

        {/* CURRENCY SETTINGS */}
        <section className="mb-8">
          <h2 className={sectionLabel}>Currency settings</h2>
          <div className="mt-1">
            <SettingRow
              label="Display currency"
              description="Used for all prices and totals."
              control={
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger className="h-9 w-24 border-hairline bg-transparent">
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
              }
            />
          </div>
        </section>

        {/* APP PREFERENCES */}
        <section className="mb-8">
          <h2 className={sectionLabel}>App preferences</h2>
          <div className="mt-1">
            <SettingRow
              label="Duplicate item alerts"
              description="Warn me before adding duplicate items."
              control={
                <Switch
                  checked={dupAlerts}
                  onCheckedChange={setDuplicateAlerts}
                  className="h-5 w-9"
                />
              }
            />
          </div>
        </section>

        {/* MY STORES */}
        <section className="mb-8">
          <h2 className={sectionLabel}>My stores</h2>
          <div className="mt-1">
            {stores.length === 0 ? (
              <div className={`${rowDivider} py-3`}>
                <p className="text-small italic text-muted-foreground">
                  Stores you've shopped at will appear here.
                </p>
              </div>
            ) : (
              <ul>
                {stores.map((s) => (
                  <li
                    key={s.id}
                    className={`${rowDivider} flex items-center justify-between gap-3 py-3 last:border-b last:border-hairline`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[15px] text-foreground">{s.name}</p>
                      {s.address && (
                        <p className="truncate text-small italic text-muted-foreground">
                          {s.address}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeStore(s.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Remove ${s.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="px-5 pt-8 pb-6">
        <Button
          variant="secondaryLight"
          size="lg"
          className="w-full"
          onClick={() => supabase.auth.signOut()}
        >
          sign out
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div
      className={`${rowDivider} flex items-center justify-between gap-4 py-3 last:border-b last:border-hairline`}
    >
      <div className="min-w-0">
        <p className="font-sans text-[15px] text-foreground">{label}</p>
        {description && (
          <p className="text-small italic text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
