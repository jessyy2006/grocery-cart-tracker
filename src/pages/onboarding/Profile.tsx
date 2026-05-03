import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OnboardingLayout from "./Layout";

const GENDERS = [
  { v: "male", l: "Male" },
  { v: "female", l: "Female" },
  { v: "other", l: "Other" },
  { v: "prefer_not", l: "Prefer not to say" },
];
const AGES = ["18-24", "25-34", "35-44", "45-54", "55+"];

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

  const canContinue = draft.firstName.trim() && draft.lastName.trim();

  return (
    <OnboardingLayout
      step={1}
      title="Tell us a bit about you"
      subtitle="Just the basics — everything else is optional."
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
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={draft.lastName} onChange={(e) => update({ lastName: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Gender (optional)</Label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.v}
                type="button"
                onClick={() => update({ gender: draft.gender === g.v ? null : g.v })}
                className={`rounded-xl border p-3 text-sm transition ${
                  draft.gender === g.v
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {g.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Age range (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {AGES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => update({ ageRange: draft.ageRange === a ? null : a })}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  draft.ageRange === a
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
