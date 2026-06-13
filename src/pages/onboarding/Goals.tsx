import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OptionRow } from "@/components/OptionRow";
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
      title="How can we help you?"
      subtitle="Pick anything that resonates."
      primaryLabel="Continue"
      primaryDisabled={draft.goals.length === 0}
      onPrimary={() => navigate("/onboarding/budget")}
    >
      <ul className="space-y-2">
        {GOALS.map((g) => (
          <li key={g.v}>
            <OptionRow
              label={g.l}
              active={draft.goals.includes(g.v)}
              onClick={() => toggle(g.v)}
              indicator="check"
            />
          </li>
        ))}
      </ul>
    </OnboardingLayout>
  );
}
