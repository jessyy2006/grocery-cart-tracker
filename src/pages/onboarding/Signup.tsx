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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/onboarding/profile", { replace: true });
  }, [user, navigate]);

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
      toast.success("Account created!");
      navigate("/onboarding/profile", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-primary px-6 py-12 text-primary-foreground">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-elevated">
          <img src="/icon-1024.png" alt="CartWise" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-primary-foreground/70">Takes less than a minute.</p>
      </div>

      <Card className="w-full max-w-sm border-transparent bg-primary-foreground/5 p-6 text-primary-foreground shadow-soft backdrop-blur">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-primary-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-primary-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            disabled={busy}
          >
            Create account
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-primary-foreground/60">
          <div className="h-px flex-1 bg-primary-foreground/20" /> or <div className="h-px flex-1 bg-primary-foreground/20" />
        </div>

        <Button
          className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={google}
          disabled={busy}
        >
          Sign up with Google
        </Button>
      </Card>
    </div>
  );
}
