import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Check, Receipt as ReceiptIcon } from "lucide-react";

export default function OnboardingIntro() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const next = () => navigate(user ? "/onboarding/profile" : "/onboarding/signup");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background px-5 pb-6 pt-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Stop overspending on groceries</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Plan your trips, avoid impulse buys, and stay on budget.
        </p>
      </div>

      <div className="relative mt-8 flex-1">
        <div className="absolute inset-x-0 bottom-0 animate-in slide-in-from-bottom-12 duration-700 ease-out">
          <div className="space-y-3 px-2">
            <Card className="p-4 shadow-elevated">
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

            <Card className="p-4 shadow-elevated">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's list</p>
              <ul className="mt-2 space-y-2 text-sm">
                {[
                  { name: "Whole milk", done: true },
                  { name: "Eggs (12 ct)", done: false },
                  { name: "Sourdough bread", done: false },
                ].map((it) => (
                  <li key={it.name} className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        it.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {it.done && <Check className="h-3 w-3" />}
                    </span>
                    <span className={it.done ? "line-through text-muted-foreground" : ""}>{it.name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>

      <Button size="lg" className="relative z-10 mt-6 w-full" onClick={next}>
        Continue
      </Button>
    </div>
  );
}
