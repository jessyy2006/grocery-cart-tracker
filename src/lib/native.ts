// Single source of truth for "are we running inside the Capacitor native shell?".
// Kept dependency-light so web builds behave exactly as before.
import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isIOSNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
};

/** Safe localStorage read — WKWebView can throw when storage is restricted. */
export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Safe localStorage write — never let a storage failure blank the screen. */
export const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
};

/** Safe localStorage delete — mirrors the guards above. */
export const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
};

