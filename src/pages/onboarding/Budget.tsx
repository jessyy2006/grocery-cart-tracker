import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { completeOnboarding, defaultBudgetCents, nameFromMetadata } from "@/lib/onboarding";
import {
  Currency,
  SUPPORTED_CURRENCIES,
  parsePriceToCents,
  setCurrency,
  useCurrency,
} from "@/lib/format";
import { SignupShell } from "@/components/onboarding/SignupShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Signup step 3 — the monthly grocery budget.
 *
 * The frame holds a currency dropdown beside the amount and a single action.
 * There is no skip control, so leaving the field empty is the skip: it applies
 * the currency-scaled default rather than blocking, and every downstream
 * "% of budget" stat still works. Only genuinely unparseable input holds the
 * button back.
 *
 * The currency picker matters more than it looks. It used to live only in
 * Profile, so a non-Canadian typing "300" here had it stored and displayed as
 * CAD indefinitely.
 */
export default function OnboardingBudget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, reset } = useOnboarding();
  const currency = useCurrency();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const trimmed = amount.trim();
  const parsed = parsePriceToCents(trimmed);
  const invalid = trimmed.length > 0 && !parsed;

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
      caption="one last step"
      title="set your budget."
      footer={
        <Button
          variant="primaryLight"
          size="lg"
          className="px-10"
          disabled={invalid || busy}
          onClick={() => finish(parsed || null)}
        >
          start saving
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-[280px] items-end gap-3">
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger
            aria-label="Currency"
            className="h-12 w-[92px] shrink-0 rounded-none border-0 border-b border-hairline px-1 focus:ring-0"
          >
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
        <Input
          variant="underline"
          aria-label="Monthly grocery budget"
          inputMode="decimal"
          autoFocus
          placeholder="ex. 300"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
    </SignupShell>
  );
}
