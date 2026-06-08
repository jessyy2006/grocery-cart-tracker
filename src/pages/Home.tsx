import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, HeroCard } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ShoppingCart, ListChecks, MapPin, ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/lib/format";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import FeatureIntroDialog from "@/components/FeatureIntroDialog";
import { FEATURE_INTRO_KEY } from "@/hooks/useOnboarding";
import { PageHeader } from "@/components/PageHeader";
import { Money } from "@/components/Money";
import { MarketLoader } from "@/components/MarketLoader";

type Trip = { id: string; started_at: string; total_cents: number; status: string };
type ShortList = { id: string; name: string };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Evening";
}

export default function Home() {
  const { user } = useAuth();
  useCurrency();
  const navigate = useNavigate();
  const { firstName, loading: profileLoading } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [introOpen, setIntroOpen] = useState(false);
  const [recent, setRecent] = useState<(Trip & { stores: string[] })[]>([]);
  const [monthSpend, setMonthSpend] = useState(0);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "list">("choose");
  const [lists, setLists] = useState<ShortList[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (searchParams.get("intro") === "1" && localStorage.getItem(FEATURE_INTRO_KEY) !== "1") {
      setIntroOpen(true);
      searchParams.delete("intro");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [savedRes, allRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id, started_at, total_cents, status, trip_items(store_name_snapshot)")
          .eq("status", "saved")
          .order("started_at", { ascending: false })
          .limit(3),
        supabase
          .from("trips")
          .select("total_cents")
          .eq("status", "saved")
          .gte("started_at", monthStart.toISOString()),
      ]);

      if (cancelled) return;

      setRecent(
        (savedRes.data ?? []).map((t: any) => ({
          ...t,
          stores: Array.from(
            new Set((t.trip_items ?? []).map((i: any) => i.store_name_snapshot).filter(Boolean))
          ) as string[],
        }))
      );
      setMonthSpend((allRes.data ?? []).reduce((a, t: any) => a + (t.total_cents ?? 0), 0));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const openSheet = async () => {
    const { data } = await supabase
      .from("shopping_lists")
      .select("id, name")
      .eq("hidden", false)
      .order("updated_at", { ascending: false });
    setLists(data ?? []);
    setStep("choose");
    setSheetOpen(true);
  };

  const startTripWith = async (listId: string | null) => {
    if (!user) return;
    setCreating(true);
    try {
      await supabase.from("trips").delete().eq("user_id", user.id).eq("status", "active");
      if (listId) {
        await supabase
          .from("shopping_list_items")
          .update({ checked_at: null, price_cents: null })
          .eq("list_id", listId);
      }
      sessionStorage.setItem("pendingTrip:listId", listId ?? "none");
      setSheetOpen(false);
      navigate("/trip/new");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start trip");
    } finally {
      setCreating(false);
    }
  };

  const today = format(new Date(), "EEEE");

  return (
    <div className="space-y-8 px-5 pt-3">
      <PageHeader
        eyebrow={
          profileLoading
            ? "\u00a0"
            : firstName
              ? `${greeting()}, ${firstName}`
              : greeting()
        }
        title={`${today} market run?`}
      />
      <FeatureIntroDialog open={introOpen} onClose={() => setIntroOpen(false)} />

      {!ready ? (
        <MarketLoader minHeight="55vh" />
      ) : (
        <>
          {/* Hero — this month */}
          <HeroCard className="overflow-hidden p-0">
            <div className="relative p-6">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent-honey/20 blur-2xl" />
              <p className="text-eyebrow">This month</p>
              <div className="mt-2 flex items-baseline gap-2">
                <Money cents={monthSpend} size="display" />
              </div>
              <p className="mt-2 text-small text-muted-foreground">
                {monthSpend === 0 ? "No spending yet — start your first trip." : "Tracked across your saved trips."}
              </p>
            </div>
            <div className="p-5 pt-0">
              <Button variant="hero" size="xl" className="w-full" onClick={openSheet}>
                <ShoppingCart className="h-5 w-5" strokeWidth={2} />
                Start a trip
              </Button>
            </div>
          </HeroCard>

          {/* Quiet link to lists */}
          <button
            onClick={() => navigate("/lists")}
            className="flex w-full items-center justify-between text-left text-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4" strokeWidth={1.75} /> Manage your shopping lists
            </span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </button>

          {/* Recent trips */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-h2">Recent trips</h2>
              {recent.length > 0 && (
                <button
                  onClick={() => navigate("/history")}
                  className="text-small text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  See all <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <Card className="p-6 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-accent-honey" strokeWidth={1.75} />
                <p className="mt-2 text-small text-muted-foreground">Your saved trips will live here.</p>
              </Card>
            ) : (
              <ul className="space-y-3">
                {recent.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => navigate(`/trip/${t.id}`)}
                      className="flex w-full items-center justify-between rounded-lg bg-card p-4 text-left shadow-soft border border-hairline hover:bg-surface-sunk transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-h3 truncate">{format(new Date(t.started_at), "EEE, MMM d")}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-small text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {t.stores.join(" · ") || "No store"}
                        </p>
                      </div>
                      <Money cents={t.total_cents} size="lg" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Unified start-trip bottom sheet (2 internal steps) */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="bg-surface-raised border-hairline rounded-t-[28px] max-h-[85vh]">
          <div className="px-5 pb-8 pt-2">
            {step === "choose" ? (
              <>
                <h2 className="text-h1 mt-2">Start a trip</h2>
                <p className="text-small text-muted-foreground mt-1">Pick a list or shop freely.</p>
                <div className="mt-6 grid gap-3">
                  <button
                    disabled={creating || lists.length === 0}
                    onClick={() => setStep("list")}
                    className="group flex items-center gap-4 rounded-lg border border-hairline bg-card p-5 text-left shadow-soft hover:border-primary hover:shadow-glow transition-all disabled:opacity-50"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/60 text-primary">
                      <ListChecks className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-h3">Shop from a list</span>
                      <span className="block text-small text-muted-foreground">
                        {lists.length === 0 ? "Create a list first" : `${lists.length} list${lists.length === 1 ? "" : "s"} available`}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </button>

                  <button
                    disabled={creating}
                    onClick={() => startTripWith(null)}
                    className="group flex items-center gap-4 rounded-lg border border-hairline bg-card p-5 text-left shadow-soft hover:border-primary hover:shadow-glow transition-all disabled:opacity-50"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-butter/60 text-foreground">
                      <Sparkles className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-h3">Shop freely</span>
                      <span className="block text-small text-muted-foreground">No list — sorted as you go</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setStep("choose")}
                    className="-ml-2 p-2 text-muted-foreground hover:text-foreground rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-h1">Pick a list</h2>
                </div>
                <ScrollArea className="mt-4 max-h-[55vh] pr-1">
                  <ul className="space-y-2.5">
                    {lists.map((l) => (
                      <li key={l.id}>
                        <button
                          disabled={creating}
                          onClick={() => startTripWith(l.id)}
                          className="flex w-full items-center gap-3 rounded-lg border border-hairline bg-card p-4 text-left transition hover:border-primary hover:shadow-soft disabled:opacity-50"
                        >
                          <ListChecks className="h-5 w-5 text-primary" strokeWidth={2} />
                          <span className="text-h3 flex-1">{l.name}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
