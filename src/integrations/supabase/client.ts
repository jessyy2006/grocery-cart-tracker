import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // localStorage is the default, but it is named explicitly because the native
    // shell depends on it: lib/nativeSession.ts mirrors every `sb-` key into
    // Capacitor Preferences so a WKWebView storage purge cannot sign users out.
    // Swapping this for a custom store would silently bypass that mirror.
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
