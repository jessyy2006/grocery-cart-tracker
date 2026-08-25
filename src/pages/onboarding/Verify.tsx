import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SignupShell } from "@/components/onboarding/SignupShell";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const RESEND_SECONDS = 45;

/**
 * Signup step 2 — the 6-digit code. Auto-submits on the sixth digit. If the
 * user taps the link in the email instead, the session arrives on its own and
 * the effect below moves them along.
 */
export default function OnboardingVerify() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft } = useOnboarding();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const submitted = useRef(false);

  // No email in the draft means this screen was reached out of order.
  useEffect(() => {
    if (!draft.email) navigate("/onboarding/signup", { replace: true });
  }, [draft.email, navigate]);

  useEffect(() => {
    if (user) navigate("/onboarding/budget", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const verify = async (value: string) => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: draft.email,
        token: value,
        type: "email",
      });
      if (error) throw error;
      // The auth listener picks the session up and the effect routes onward.
    } catch (err) {
      submitted.current = false;
      setCode("");
      toast.error(err instanceof Error ? err.message : "That code didn't work");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setCooldown(RESEND_SECONDS);
    const { error } = await supabase.auth.signInWithOtp({
      email: draft.email,
      options: {
        shouldCreateUser: true,
        data: { first_name: draft.firstName },
        emailRedirectTo: window.location.origin + "/onboarding/verify",
      },
    });
    if (error) toast.error(error.message);
    else toast.success("New code sent");
  };

  return (
    <SignupShell
      caption="step 2 of 3"
      title="check your email."
      onBack={() => navigate("/onboarding/signup")}
      footer={
        <>
          <Button
            variant="primaryLight"
            size="lg"
            className="w-full"
            disabled={code.length !== 6 || busy}
            onClick={() => verify(code)}
          >
            Verify
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground"
            disabled={cooldown > 0}
            onClick={resend}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-body text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{draft.email}</span>.
        </p>
        <InputOTP
          maxLength={6}
          value={code}
          autoFocus
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) verify(v);
          }}
        >
          <InputOTPGroup className="w-full justify-between gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="h-14 flex-1 rounded-control border text-h2"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
    </SignupShell>
  );
}
