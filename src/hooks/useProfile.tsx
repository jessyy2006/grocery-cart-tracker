import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const seedFromMeta = (user: { user_metadata?: Record<string, unknown> } | null): string | null => {
  if (!user?.user_metadata) return null;
  const meta = user.user_metadata as Record<string, string | undefined>;
  const given = meta.given_name;
  const full = meta.full_name;
  return given?.trim() || full?.split(" ")[0]?.trim() || null;
};

export const useProfile = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(() => seedFromMeta(user));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!user) {
      setFirstName(null);
      setLoading(false);
      return;
    }
    // Seed synchronously from auth metadata so the visible name doesn't flash.
    const seeded = seedFromMeta(user);
    if (seeded) setFirstName(seeded);

    let cancel = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_onboarding")
        .select("first_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      setFirstName(data?.first_name?.trim() || seeded || null);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  return { firstName, loading };
};
