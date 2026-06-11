import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { AppLayout } from "@/components/AppLayout";

import Home from "./pages/Home";
import StartTrip from "./pages/StartTrip";
import ActiveTrip from "./pages/ActiveTrip";
import History from "./pages/History";
import TripDetail from "./pages/TripDetail";
import Profile from "./pages/Profile";
import Lists from "./pages/Lists";
import ListDetail from "./pages/ListDetail";
import Finance from "./pages/Finance";
import ScanReceipt from "./pages/ScanReceipt";
import NotFound from "./pages/NotFound.tsx";
import OnboardingIntro from "./pages/onboarding/Intro";
import OnboardingSignup from "./pages/onboarding/Signup";
import OnboardingProfile from "./pages/onboarding/Profile";
import OnboardingGoals from "./pages/onboarding/Goals";
import OnboardingBudget from "./pages/onboarding/Budget";
import OnboardingBehavior from "./pages/onboarding/Behavior";
import OnboardingFirstList from "./pages/onboarding/FirstList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OnboardingProvider>
            <Routes>
              <Route path="/onboarding" element={<OnboardingIntro />} />
              <Route path="/onboarding/signup" element={<OnboardingSignup />} />
              <Route
                path="/onboarding/profile"
                element={
                  <RequireAuth>
                    <OnboardingProfile />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding/goals"
                element={
                  <RequireAuth>
                    <OnboardingGoals />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding/budget"
                element={
                  <RequireAuth>
                    <OnboardingBudget />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding/behavior"
                element={
                  <RequireAuth>
                    <OnboardingBehavior />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding/first-list"
                element={
                  <RequireAuth>
                    <OnboardingFirstList />
                  </RequireAuth>
                }
              />
              <Route
                element={
                  <RequireAuth>
                    <RequireOnboarding>
                      <AppLayout />
                    </RequireOnboarding>
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Home />} />
                <Route path="/trip/new" element={<StartTrip />} />
                <Route path="/trip" element={<ActiveTrip />} />
                <Route path="/trip/:id" element={<TripDetail />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/lists" element={<Lists />} />
                <Route path="/lists/:id" element={<ListDetail />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/scan-receipt" element={<ScanReceipt />} />
              </Route>
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OnboardingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
