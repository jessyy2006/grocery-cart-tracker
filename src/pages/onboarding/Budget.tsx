import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/hooks/useOnboarding";
import { parsePriceToCents, useCurrency } from "@/lib/format";
import OnboardingLayout from "./Layout";

export default function OnboardingBudget() {
  const navigate = useNavigate();
  const { draft, update } = useOnboarding();
  const currency = useCurrency();
  const [value, setValue] = useState(
    draft.budgetCents != null ? (draft.budgetCents / 100).toString() : ""
  );

  const submit = () => {
    const cents = value.trim() ? parsePriceToCents(value) : null;
    update({ budgetCents: cents });
    navigate("/onboarding/behavior");
  };

  return (
    <OnboardingLayout
      step={3}
      title="Set your grocery budget"
      subtitle={`We'll track your spending against this goal in ${currency}.`}
      primaryLabel="Continue"
      primaryDisabled={!value.trim()}
      onPrimary={submit}
    >
      <div className="space-y-2">
        <Label htmlFor="budget">Monthly budget</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
          <Input
            id="budget"
            inputMode="decimal"
            placeholder="400"
            className="pl-12 text-lg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Don't worry, you can change this later.</p>
      </div>
    </OnboardingLayout>
  );
}
