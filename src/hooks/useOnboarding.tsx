import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/native";

export const ONBOARDED_KEY = "cartwise:onboarded";
const DRAFT_KEY = "cartwise:onboardingDraft";

/**
 * The signup half of onboarding is resumable: if a user quits after entering
 * their email we never ask for it again. The showcase deliberately is *not*
 * resumable — it always replays from the hero.
 */
export type OnboardingDraft = {
  firstName: string;
  email: string;
  /** Set once an OTP has been dispatched, so a returning user lands on verify. */
  codeSent: boolean;
};

const DEFAULT: OnboardingDraft = { firstName: "", email: "", codeSent: false };

const readDraft = (): OnboardingDraft => {
  try {
    const raw = safeGetItem(DRAFT_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<OnboardingDraft>) };
  } catch {
    return DEFAULT;
  }
};

type Ctx = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraft] = useState<OnboardingDraft>(readDraft);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      safeSetItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    safeRemoveItem(DRAFT_KEY);
    setDraft(DEFAULT);
  }, []);

  return (
    <OnboardingContext.Provider value={{ draft, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
};
