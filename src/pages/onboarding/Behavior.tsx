import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
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
      step={3}
      title="How do you usually shop?"
      primaryLabel="Continue"
      primaryDisabled={!draft.shoppingBehavior}
      onPrimary={() => navigate("/onboarding/first-list")}
    >
      <ul className="space-y-2">
        {OPTIONS.map((o) => {
          const active = draft.shoppingBehavior === o.v;
          return (
            <li key={o.v}>
              <button
                type="button"
                onClick={() => update({ shoppingBehavior: o.v })}
                className={`w-full rounded-2xl border p-4 text-left font-medium transition ${
                  active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                {o.l}
              </button>
            </li>
          );
        })}
      </ul>
    </OnboardingLayout>
  );
}
