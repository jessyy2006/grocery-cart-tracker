import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { completeOnboarding, defaultBudgetCents, nameFromMetadata } from "@/lib/onboarding";
import { formatMoney, parsePriceToCents, useCurrency } from "@/lib/format";
import { SignupShell } from "@/components/onboarding/SignupShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Signup step 3 — the monthly grocery budget. Skippable: skipping stores a
 * currency-scaled default so every downstream "% of budget" stat still works.
 */
export default function OnboardingBudget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, reset } = useOnboarding();
  const currency = useCurrency();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = parsePriceToCents(amount);
  const finish = async (budgetCents: number | null) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await completeOnboarding(user.id, {
        firstName: draft.firstName || nameFromMetadata(user.user_metadata),
        budgetCents,
      });
      reset();
      navigate("/?intro=1", { replace: true });
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not save your budget");
    }
  };

  return (
    <SignupShell
      caption="step 3 of 3"
      title="set a monthly budget."
      footer={
        <>
          <Button
            variant="primaryLight"
            size="lg"
            className="w-full"
            disabled={!parsed || busy}
            onClick={() => finish(parsed)}
          >
            Start saving
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground"
            disabled={busy}
            onClick={() => finish(null)}
          >
            Skip for now
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-body text-muted-foreground">
          Every trip gets measured against this. You can change it any time.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="budget">Monthly grocery budget ({currency})</Label>
          <Input
            id="budget"
            inputMode="decimal"
            autoFocus
            placeholder={formatMoney(defaultBudgetCents(), currency, 0)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 text-h2"
          />
          <p className="text-small text-muted-foreground">
            Skip and we'll start you at {formatMoney(defaultBudgetCents(), currency, 0)}.
          </p>
        </div>
      </div>
    </SignupShell>
  );
}
