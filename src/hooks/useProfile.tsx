import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useProfile = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFirstName(null);
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("first_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      const fromMeta =
        (user.user_metadata?.given_name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
      setFirstName(data?.first_name?.trim() || fromMeta || null);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  return { firstName, loading };
};
