import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Receipt as ReceiptIcon } from "lucide-react";

export default function OnboardingIntro() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const next = () => navigate(user ? "/onboarding/profile" : "/onboarding/signup");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background px-5 pb-6 pt-12 safe-bottom">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">Cartwise</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Plan your groceries. Stop overspending.
        </p>
      </div>

      <div className="relative mt-8 flex-1">
        {/* List card — tall rectangle, bottom-right with left offset */}
        <Card
          className="absolute left-8 right-0 bottom-0 h-[78%] overflow-hidden p-4 shadow-elevated animate-in slide-in-from-bottom-16 fade-in duration-700 ease-out"
          style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's list</p>
          <div className="mt-3 space-y-3">
            {[
              { emoji: "🥬", label: "Produce", items: ["Bananas", "Spinach"] },
              { emoji: "🥛", label: "Dairy", items: ["1% Milk", "Greek yogurt"] },
              { emoji: "🍞", label: "Bakery", items: ["Sourdough bread"] },
              { emoji: "🥩", label: "Meat & Seafood", items: ["Chicken breast"] },
              { emoji: "🥫", label: "Pantry", items: ["Soy sauce"] },
            ].map((g) => (
              <div key={g.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.emoji} {g.label}
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {g.items.map((it) => (
                    <li key={it} className="rounded-md border border-border/60 px-2 py-1 text-xs">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* Budget card — top-left, overlaps list card */}
        <Card
          className="absolute left-0 right-8 top-0 p-4 shadow-elevated animate-in slide-in-from-bottom-16 fade-in duration-700 ease-out"
          style={{ animationDelay: "320ms", animationFillMode: "backwards" }}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <ReceiptIcon className="h-3.5 w-3.5" /> This month
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-bold">$248.30</span>
            <span className="text-sm text-muted-foreground">of $400 budget</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
        </Card>
      </div>

      <Button variant="primaryLight" size="lg" className="relative z-10 mt-6 w-full" onClick={next}>
        Start saving
      </Button>
    </div>
  );
}
