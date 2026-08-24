// Durable auth-session storage for the native shell.
//
// The Supabase client (auto-generated, not editable) persists the session in
// localStorage. Inside a WKWebView that store is not guaranteed durable — iOS
// can purge it under storage pressure, silently signing users out.
//
// Fix without touching the generated client: before the app renders, hydrate
// localStorage from Capacitor Preferences (Keychain/UserDefaults-backed), then
// mirror every subsequent auth-key write back into Preferences.
import { Preferences } from "@capacitor/preferences";
import { isNative } from "./native";

const AUTH_KEY_PREFIX = "sb-";
const INDEX_KEY = "cartwise:auth-keys";

const isAuthKey = (key: string) => key.startsWith(AUTH_KEY_PREFIX);

const readIndex = async (): Promise<string[]> => {
  const { value } = await Preferences.get({ key: INDEX_KEY });
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeIndex = (keys: string[]) =>
  Preferences.set({ key: INDEX_KEY, value: JSON.stringify(Array.from(new Set(keys))) });

/**
 * Must be awaited before the React tree mounts (and therefore before the
 * Supabase client reads the session). No-ops on web.
 */
export async function hydrateNativeSession(): Promise<void> {
  if (!isNative()) return;
  try {
    const keys = await readIndex();
    for (const key of keys) {
      const { value } = await Preferences.get({ key });
      if (value != null && localStorage.getItem(key) == null) {
        localStorage.setItem(key, value);
      }
    }
    installMirror();
  } catch {
    // Storage unavailable — fall back to plain localStorage behaviour.
  }
}

let mirrorInstalled = false;

function installMirror() {
  if (mirrorInstalled) return;
  mirrorInstalled = true;

  const proto = Object.getPrototypeOf(localStorage) as Storage;
  const origSet = proto.setItem.bind(localStorage);
  const origRemove = proto.removeItem.bind(localStorage);

  localStorage.setItem = (key: string, value: string) => {
    origSet(key, value);
    if (!isAuthKey(key)) return;
    void (async () => {
      try {
        await Preferences.set({ key, value });
        await writeIndex([...(await readIndex()), key]);
      } catch {
        /* noop */
      }
    })();
  };

  localStorage.removeItem = (key: string) => {
    origRemove(key);
    if (!isAuthKey(key)) return;
    void (async () => {
      try {
        await Preferences.remove({ key });
        await writeIndex((await readIndex()).filter((k) => k !== key));
      } catch {
        /* noop */
      }
    })();
  };
}
