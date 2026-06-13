import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OptionRow } from "@/components/OptionRow";
import OnboardingLayout from "./Layout";

const OPTIONS = [
  { v: "plan_all", l: "I plan everything in advance" },
  { v: "plan_most", l: "I plan most items but add extras" },
  { v: "decide_in_store", l: "I usually decide in-store" },
];

export default function OnboardingBehavior() {
  const navigate = useNavigate();
  const { draft, update } = useOnboarding();

  return (
    <OnboardingLayout
      step={4}
      title="How do you usually shop?"
      primaryLabel="Continue"
      primaryDisabled={!draft.shoppingBehavior}
      onPrimary={() => navigate("/onboarding/first-list")}
    >
      <ul className="space-y-2">
        {OPTIONS.map((o) => (
          <li key={o.v}>
            <OptionRow
              label={o.l}
              active={draft.shoppingBehavior === o.v}
              onClick={() => update({ shoppingBehavior: o.v })}
              indicator="radio"
            />
          </li>
        ))}
      </ul>
    </OnboardingLayout>
  );
}
