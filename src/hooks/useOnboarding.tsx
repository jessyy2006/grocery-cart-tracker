import { createContext, useContext, useState, ReactNode } from "react";

export type OnboardingListItem = {
  name: string;
  qty: number;
  category: string;
  notes: string | null;
};

export type OnboardingDraft = {
  firstName: string;
  lastName: string;
  goals: string[];
  budgetCents: number | null; // null = skipped (use default)
  shoppingBehavior: string | null;
  firstListItems: OnboardingListItem[];
};

const DEFAULT: OnboardingDraft = {
  firstName: "",
  lastName: "",
  goals: [],
  budgetCents: null,
  shoppingBehavior: null,
  firstListItems: [
    { name: "Milk", qty: 1, category: "dairy", notes: null },
    { name: "Eggs", qty: 1, category: "dairy", notes: null },
    { name: "Bread", qty: 1, category: "bakery", notes: null },
  ],
};

type Ctx = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT);
  const update = (patch: Partial<OnboardingDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const reset = () => setDraft(DEFAULT);
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

export const ONBOARDED_KEY = "cartwise:onboarded";
export const FEATURE_INTRO_KEY = "cartwise:featureIntroShown";
