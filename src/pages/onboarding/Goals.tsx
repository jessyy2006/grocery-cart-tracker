import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import OnboardingLayout from "./Layout";

const GOALS = [
  { v: "budget", l: "Stick to a grocery budget" },
  { v: "impulse", l: "Avoid impulse purchases" },
  { v: "plan", l: "Plan my shopping better" },
  { v: "track", l: "Track my spending" },
];

export default function OnboardingGoals() {
  const navigate = useNavigate();
  const { draft, update } = useOnboarding();

  const toggle = (v: string) => {
    const has = draft.goals.includes(v);
    update({ goals: has ? draft.goals.filter((g) => g !== v) : [...draft.goals, v] });
  };

  return (
    <OnboardingLayout
      step={2}
      title="What do you want help with?"
      subtitle="Pick anything that resonates."
      primaryLabel="Continue"
      primaryDisabled={draft.goals.length === 0}
      onPrimary={() => navigate("/onboarding/budget")}
    >
      <ul className="space-y-2">
        {GOALS.map((g) => {
          const active = draft.goals.includes(g.v);
          return (
            <li key={g.v}>
              <button
                type="button"
                onClick={() => toggle(g.v)}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <span className="font-medium">{g.l}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {active && <Check className="h-4 w-4" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </OnboardingLayout>
  );
}
