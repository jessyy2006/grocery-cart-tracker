import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function OnboardingSignup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"google" | "email">("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/onboarding/profile", { replace: true });
  }, [user, navigate]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/onboarding/profile",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate("/onboarding/profile", { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/onboarding/profile" },
      });
      if (error) throw error;
      toast.success("Account created — check your email to confirm.");
      navigate("/onboarding/profile", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Takes less than a minute.</p>
      </div>
      <Card className="w-full max-w-sm p-6 shadow-soft">
        <Button className="w-full" size="lg" onClick={google} disabled={busy}>
          Continue with Google
        </Button>

        {mode === "email" ? (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={busy}>
              Create account
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setMode("email")}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Continue with email
          </button>
        )}
      </Card>
    </div>
  );
}
