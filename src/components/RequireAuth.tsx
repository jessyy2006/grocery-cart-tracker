import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/onboarding/signup" replace state={{ from: location }} />;
  return children;
};
