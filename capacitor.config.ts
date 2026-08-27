import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cartwise.app",
  appName: "CartWise",
  webDir: "dist",
  // NOTE: there is deliberately no `server` block. The app ships the bundled
  // `dist/` output. Adding a `server.url` here points the shell at remote content,
  // which breaks offline use and fails App Store review — never commit one.
  // For hot reload during development, run `npx cap run ios --live-reload` instead,
  // which injects the dev server at run time without touching this file.
  ios: {
    contentInset: "always",
  },
};

export default config;
