import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding, ONBOARDED_KEY } from "@/hooks/useOnboarding";
import { nameFromMetadata } from "@/lib/onboarding";
import { isNative, safeGetItem, safeSetItem } from "@/lib/native";
import { SignupShell } from "@/components/onboarding/SignupShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONBOARDING_CHECK_TIMEOUT = 8_000;

type OnboardingRow = { completed_at?: string | null };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Signup step 1 — first name + email. No password: we mail a 6-digit code.
 * Google users skip this screen entirely (and the code screen) via OAuth.
 */
export default function OnboardingSignup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, update } = useOnboarding();
  const [firstName, setFirstName] = useState(draft.firstName);
  const [email, setEmail] = useState(draft.email);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleBusyRef = useRef(false);

  // Already signed in (returning user, or fresh OAuth): skip ahead.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const seeded = nameFromMetadata(user.user_metadata);
      if (seeded && !draft.firstName) update({ firstName: seeded });

      if (safeGetItem(ONBOARDED_KEY) === "1") {
        navigate("/", { replace: true });
        return;
      }
      try {
        const { data } = await withTimeout(
          (supabase as any)
            .from("user_onboarding")
            .select("completed_at")
            .eq("user_id", user.id)
            .maybeSingle() as Promise<{ data: OnboardingRow | null }>,
          ONBOARDING_CHECK_TIMEOUT,
        );
        if (cancelled) return;
        if (data?.completed_at) {
          safeSetItem(ONBOARDED_KEY, "1");
          navigate("/", { replace: true });
        } else {
          navigate("/onboarding/budget", { replace: true });
        }
      } catch {
        if (!cancelled) {
          toast.error("Couldn't verify your account. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Unlock the Google button if the user bounced back without authenticating.
  useEffect(() => {
    const unlockIfIdle = () => {
      if (googleBusyRef.current && !user) {
        googleBusyRef.current = false;
        setGoogleBusy(false);
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") setTimeout(unlockIfIdle, 500);
    };
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const valid = firstName.trim().length > 0 && EMAIL_RE.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = firstName.trim();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        // No emailRedirectTo: this flow verifies with the 6-digit code. Passing
        // a redirect makes Supabase mint a confirmation link, which is what the
        // email was leading with — and inside the native shell the origin is
        // capacitor://localhost, so that link dead-ends anyway.
        options: { shouldCreateUser: true, data: { first_name: cleanName } },
      });
      if (error) throw error;
      update({ firstName: cleanName, email: cleanEmail, codeSent: true });
      navigate("/onboarding/verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your code");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Google goes straight to Supabase, not through Lovable.
   *
   * The Lovable SDK sent the browser to `/~oauth/initiate`, a route that only
   * exists on Lovable's own servers — so the round trip 404'd on localhost and
   * could never complete inside the native shell, where there is no server at
   * all. Supabase's `/auth/v1/authorize` works from any origin, which is the
   * only version of this that survives a TestFlight build.
   *
   * Requires the Google provider to be configured in Supabase (Authentication →
   * Providers → Google) with a client ID and secret from the Google Cloud
   * console, and this origin present in the redirect allow-list. Without that
   * Supabase answers "Unsupported provider: missing OAuth secret", which is
   * surfaced below rather than swallowed.
   */
  const google = async () => {
    googleBusyRef.current = true;
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/onboarding/signup" },
      });
      if (error) {
        toast.error(error.message ?? "Google sign-in failed");
        googleBusyRef.current = false;
        setGoogleBusy(false);
        return;
      }
      // Redirected — the effect above routes onward once the session lands.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      googleBusyRef.current = false;
      setGoogleBusy(false);
    }
  };

  return (
    <SignupShell
      caption="ready to start saving?"
      title="first, tell us who you are."
      footer={
        <>
          <Button
            variant="primaryLight"
            size="lg"
            className="px-10"
            disabled={!valid || busy}
            onClick={submit}
          >
            send my code
          </Button>
          {/*
            Still web-only, but the blocker has moved. Going through Supabase
            rather than Lovable removes the server-route problem; what remains
            is that `window.location.origin` is `capacitor://localhost` in the
            shell, so the callback has nowhere to land. Enabling this natively
            needs a custom-scheme redirect registered three places — the iOS
            Info.plist, Supabase's redirect allow-list, and the Google console —
            plus a Capacitor `appUrlOpen` listener to catch the callback and
            hand its tokens to `setSession`. See MOBILE.md.

            Email OTP works natively today and satisfies Guideline 4.8 as the
            privacy-preserving sign-in option, so nothing is blocked on this.
          */}
          {!isNative() && (
            <Button
              variant="secondaryLight"
              size="lg"
              className="px-10"
              onClick={google}
              disabled={googleBusy}
            >
              continue with google
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={submit} className="mx-auto w-full max-w-[280px] space-y-7">
        <Input
          variant="underline"
          aria-label="First name"
          placeholder="first name"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          variant="underline"
          aria-label="Email"
          placeholder="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </SignupShell>
  );
}
