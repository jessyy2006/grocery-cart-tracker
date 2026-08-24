import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Trash2, Receipt, MapPin, Heart, Camera, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES, useCurrency, setCurrency, Currency } from "@/lib/format";
import { useDuplicateAlerts, setDuplicateAlerts } from "@/lib/prefs";
import { PageLoadGate } from "@/components/PageLoadGate";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { invokeWithTimeout } from "@/lib/invoke";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Store = { id: string; name: string; address: string | null };

const sectionLabel = "text-eyebrow";

export default function Profile() {
  const { user } = useAuth();
  const { firstName } = useProfile();
  const currency = useCurrency();
  const [stores, setStores] = useState<Store[]>([]);
  const dupAlerts = useDuplicateAlerts();

  const [ready, setReady] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const [favItem, setFavItem] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  /** Apple guideline 5.1.1(v): in-app, permanent account deletion. */
  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await invokeWithTimeout("delete-account", {}, 30_000);
      await supabase.auth.signOut();
      toast.success("Account deleted");
      window.location.replace("/");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Couldn't delete account");
      setDeleting(false);
    }
  };


  const [editingCity, setEditingCity] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  const loadStores = async () => {
    const { data } = await supabase.from("stores").select("id, name, address").order("name");
    setStores(data ?? []);
  };

  const signAvatar = async (path: string) => {
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
    setAvatarUrl(data?.signedUrl ?? null);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [storesRes, profileRes, tripsRes] = await Promise.all([
        supabase.from("stores").select("id, name, address").order("name"),
        (supabase as any).from("profiles").select("city, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("trips").select("id").eq("user_id", user.id).eq("status", "saved"),
      ]);
      if (cancelled) return;

      setStores(storesRes.data ?? []);
      setTripCount(tripsRes.data?.length ?? 0);
      setCity(profileRes.data?.city ?? null);
      if (profileRes.data?.avatar_url) await signAvatar(profileRes.data.avatar_url);

      const tripIds = (tripsRes.data ?? []).map((t) => t.id);
      if (tripIds.length) {
        const { data: items } = await supabase
          .from("trip_items")
          .select("name_snapshot, qty")
          .in("trip_id", tripIds);
        const totals = new Map<string, { label: string; qty: number }>();
        for (const it of items ?? []) {
          const key = it.name_snapshot.trim().toLowerCase();
          if (!key) continue;
          const prev = totals.get(key);
          totals.set(key, { label: it.name_snapshot.trim(), qty: (prev?.qty ?? 0) + (it.qty ?? 1) });
        }
        const top = [...totals.values()].sort((a, b) => b.qty - a.qty)[0];
        if (!cancelled) setFavItem(top?.label ?? null);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const removeStore = async (id: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) toast.error(error.message);
    else loadStores();
  };

  const saveCity = async (value: string) => {
    if (!user) return;
    setCity(value);
    setEditingCity(false);
    setCityQuery("");
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ city: value })
      .eq("id", user.id);
    if (error) toast.error(error.message);
  };

  const onPickAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error(error.message);
    } else {
      await (supabase as any).from("profiles").update({ avatar_url: path }).eq("id", user.id);
      await signAvatar(path);
    }
    setUploading(false);
  };

  const displayName = (firstName ?? user?.email?.split("@")[0] ?? "profile").toLowerCase();

  return (
    <PageLoadGate ready={ready}>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6">
          {/* HERO */}
          <header className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-h1 break-words pb-1 leading-[1.25]">{displayName}</h1>
                <p className="mt-1 text-small text-muted-foreground">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile picture"
                className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-hairline bg-muted"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile picture" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Camera className="h-5 w-5" />
                  </span>
                )}
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-[10px] font-mono uppercase">
                    …
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* STAT LINES */}
            <dl className="mt-5 space-y-2.5 border-b border-hairline pb-5">
              <StatLine icon={<Receipt className="h-4 w-4" />} label="trips logged">
                <span className="text-foreground">{tripCount}</span>
              </StatLine>

              <StatLine icon={<MapPin className="h-4 w-4" />} label="home">
                {editingCity ? (
                  <Input
                    autoFocus
                    value={cityQuery}
                    placeholder="where do you live?"
                    enterKeyHint="done"
                    onChange={(e) => setCityQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                        const value = cityQuery.trim();
                        if (value) saveCity(value);
                        else setEditingCity(false);
                      } else if (e.key === "Escape") {
                        setEditingCity(false);
                      }
                    }}
                    onBlur={() => {
                      const value = cityQuery.trim();
                      if (value) saveCity(value);
                      else setEditingCity(false);
                    }}
                    className="h-8 rounded-control border-hairline bg-transparent px-2 text-[15px] focus-visible:ring-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCityQuery(city ?? "");
                      setEditingCity(true);
                    }}
                    className={city ? "text-foreground" : "text-primary"}
                  >
                    {city ?? "+Add"}
                  </button>
                )}
              </StatLine>

              <StatLine icon={<Heart className="h-4 w-4" />} label="favorite item">
                <span className={favItem ? "text-foreground" : "text-muted-foreground italic"}>
                  {favItem ?? "no items yet"}
                </span>
              </StatLine>
            </dl>
          </header>

          {/* SETTINGS */}
          <section className="mb-8">
            <h2 className={sectionLabel}>Settings</h2>
            <div className="mt-1 divide-y divide-hairline">
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
              <SettingRow
                label="Duplicate item alerts"
                description="Warn me before adding duplicate items."
                control={
                  <Switch
                    checked={dupAlerts}
                    onCheckedChange={setDuplicateAlerts}
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
                <EmptyState
                  size="section"
                  icon={StoreIcon}
                  title="no stores yet"
                  description="start a trip to add your first store"
                />
              ) : (
                <ul>
                  {stores.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-3"
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

        <div className="space-y-3 px-5 pt-8 pb-6">
          <Button
            variant="secondaryLight"
            size="lg"
            className="w-full"
            onClick={() => supabase.auth.signOut()}
          >
            sign out
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setDeleteConfirm("");
              setDeleteOpen(true);
            }}
          >
            delete account
          </Button>
        </div>

        <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete account</DialogTitle>
              <DialogDescription>
                This permanently deletes your trips, lists and stores. It can't be undone. Type
                DELETE to confirm.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect="off"
            />
            <DialogFooter className="flex-row gap-3">
              <Button
                variant="secondaryLight"
                className="min-w-0 flex-1"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                cancel
              </Button>
              <Button
                variant="primaryLight"
                className="min-w-0 flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                onClick={deleteAccount}
              >
                {deleting ? "deleting…" : "delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageLoadGate>
  );
}

function StatLine({
  icon,
  label,
  children,
  /** Disables truncation so overlays (e.g. autocomplete) aren't clipped. */
  allowOverflow = false,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  allowOverflow?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 text-body", allowOverflow && "relative z-10")}>
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className={cn("min-w-0 flex-1", !allowOverflow && "truncate")}>{children}</dd>
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
      className="flex items-center justify-between gap-4 py-3"
    >
      <div className="min-w-0">
        <p className="font-sans text-[15px] text-foreground">{label}</p>
        {description && <p className="text-small italic text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
