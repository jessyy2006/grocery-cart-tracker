import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.p6b5394a6a7dc4ca5a38383f61b5ff35a",
  appName: "cartwise-by-jess",
  webDir: "dist",
  // Dev-only hot reload against the Lovable sandbox.
  // REMOVE this `server` block before producing a TestFlight / App Store build
  // so the app ships the bundled `dist/` output instead of remote content.
  server: {
    url: "https://6b5394a6-a7dc-4ca5-a383-83f61b5ff35a.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
