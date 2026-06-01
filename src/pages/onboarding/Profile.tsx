import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OnboardingLayout from "./Layout";

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, update } = useOnboarding();

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const given = meta.given_name as string | undefined;
    const family = meta.family_name as string | undefined;
    const full = meta.full_name as string | undefined;
    if (!draft.firstName && (given || full)) {
      const first = given ?? full!.split(" ")[0];
      const last = family ?? (full ? full.split(" ").slice(1).join(" ") : "");
      update({ firstName: first, lastName: last });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const canContinue = !!draft.firstName.trim();

  return (
    <OnboardingLayout
      step={0}
      title="Tell us about you."
      subtitle="Just your name — that's it."
      primaryLabel="Continue"
      primaryDisabled={!canContinue}
      onPrimary={() => navigate("/onboarding/goals")}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={draft.firstName} onChange={(e) => update({ firstName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name (optional)</Label>
            <Input id="last" value={draft.lastName} onChange={(e) => update({ lastName: e.target.value })} />
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
