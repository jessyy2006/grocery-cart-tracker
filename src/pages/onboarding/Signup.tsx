import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { ONBOARDED_KEY } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function OnboardingSignup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"create" | "signin">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Route the user once authenticated: existing onboarders skip the flow.
  const routePostAuth = async (userId: string) => {
    if (localStorage.getItem(ONBOARDED_KEY) === "1") {
      navigate("/", { replace: true });
      return;
    }
    const { data } = await (supabase as any)
      .from("user_onboarding")
      .select("completed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.completed_at) {
      localStorage.setItem(ONBOARDED_KEY, "1");
      navigate("/", { replace: true });
    } else {
      navigate("/onboarding/profile", { replace: true });
    }
  };

  useEffect(() => {
    if (user) routePostAuth(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitCreate = async (e: React.FormEvent) => {
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

  const submitSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signinEmail,
        password: signinPassword,
      });
      if (error) throw error;
      if (data.user) await routePostAuth(data.user.id);
    } catch (err: any) {
      toast.error(err.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/onboarding/signup",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    // routePostAuth will fire via the useEffect once `user` updates.
  };

  const isSignin = tab === "signin";

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-elevated">
          <img src="/icon-1024.png" alt="CartWise" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isSignin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignin ? "Sign in to continue." : "Takes less than a minute."}
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 shadow-soft">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "signin")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create account</TabsTrigger>
            <TabsTrigger value="signin">Sign in</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
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
              <Button
                type="submit"
                variant="outline"
                className="w-full border-2 border-primary text-primary hover:bg-primary/5 hover:text-primary"
                disabled={busy}
              >
                Create account
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin" className="mt-4">
            <form onSubmit={submitSignin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  required
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  required
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                />
              </div>
              <Button variant="primaryLight" size="lg" type="submit" className="w-full" disabled={busy}>
                Sign in
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant={isSignin ? "default" : "default"}
          className="w-full"
          onClick={google}
          disabled={busy}
        >
          {isSignin ? "Sign in with Google" : "Sign up with Google"}
        </Button>
      </Card>
    </div>
  );
}
