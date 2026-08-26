import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SignupShell } from "@/components/onboarding/SignupShell";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/**
 * Supabase's default minimum gap between auth emails. Matching it here means
 * our countdown agrees with the server's instead of inviting a request the
 * server will refuse.
 */
const RESEND_SECONDS = 60;

/**
 * Supabase phrases its rate limit as "For security purposes, you can only
 * request this after N seconds." Pulling N out lets the UI resynchronise with
 * the server rather than insisting on a countdown the server disagrees with.
 */
const secondsFromRateLimit = (message: string): number | null => {
  const m = message.match(/after (\d+) seconds?/i);
  return m ? Number(m[1]) : null;
};

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
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [sending, setSending] = useState(false);
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
    }
  };

  /**
   * Always available, never hidden. Asking too early answers with a message
   * rather than a dead control — a link that vanishes for a minute reads as the
   * screen breaking, and a disabled countdown makes the loudest element on the
   * screen an apology.
   */
  const resend = async () => {
    if (sending) return;
    if (cooldown > 0) {
      toast(`you can ask for a new code in ${cooldown}s`);
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: draft.email,
        // No emailRedirectTo: this flow verifies with the 6-digit code, and
        // supplying a redirect only produces a link that dead-ends inside the
        // native shell, where the origin is capacitor://localhost.
        options: { shouldCreateUser: true, data: { first_name: draft.firstName } },
      });
      if (error) {
        const wait = secondsFromRateLimit(error.message);
        if (wait !== null) {
          setCooldown(wait);
          toast(`you can ask for a new code in ${wait}s`);
        } else {
          toast.error(error.message);
        }
        return;
      }
      setCooldown(RESEND_SECONDS);
      toast.success("new code sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <SignupShell
      caption="almost there…"
      title="confirm the 6 digit code."
      // Kept: mistyping your email on the previous screen leaves this as the
      // only way out. Everything else on the frame is chrome; this is recovery.
      onBack={() => navigate("/onboarding/signup")}
      footer={null}
    >
      <div className="mx-auto w-full max-w-[300px] space-y-8">
        <InputOTP
          maxLength={6}
          value={code}
          autoFocus
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) verify(v);
          }}
        >
          <InputOTPGroup className="w-full justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="h-14 flex-1 rounded-control border text-h2"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <button
          type="button"
          onClick={resend}
          className="press focus-ring mx-auto block rounded-control px-3 py-1.5 text-small text-muted-foreground"
        >
          didn't get it? click here to resend
        </button>
      </div>
    </SignupShell>
  );
}
