# CartWise — native (iOS / TestFlight) build

The web app is wrapped with [Capacitor](https://capacitorjs.com). The web build is unchanged; native code paths are gated behind `isNative()` (`src/lib/native.ts`).

## First-time setup

```bash
# after exporting to GitHub and pulling locally
npm install
npx cap add ios          # and/or: npx cap add android
npm run build
npx cap sync
npx cap run ios          # requires macOS + Xcode
```

Re-run `npm run build && npx cap sync` after every `git pull`.

## Required Info.plist strings

Add these in Xcode (`ios/App/App/Info.plist`). Without them iOS terminates the app the first time the feature is used:

| Key | Suggested value |
| --- | --- |
| `NSCameraUsageDescription` | CartWise uses the camera to scan barcodes and receipts. |
| `NSPhotoLibraryUsageDescription` | CartWise lets you pick a receipt photo or profile picture from your library. |
| `NSLocationWhenInUseUsageDescription` | CartWise uses your location to suggest nearby stores. |

## Before an App Store / TestFlight build

Remove the `server` block in `capacitor.config.ts`. It points the shell at the Lovable sandbox for hot reload; shipping it would make the app load remote content and fail review.

## Compliance notes

- **Account deletion** (Guideline 5.1.1(v)) is implemented: Profile → "delete account", backed by the `delete-account` edge function, which removes the user's rows and their auth record.
- **Session durability**: on native the auth session is mirrored into Capacitor Preferences (`src/lib/nativeSession.ts`) and rehydrated before the app mounts, so a WKWebView storage purge doesn't sign users out.
- **Camera failures** now surface a readable message plus "Upload photo" / "Enter manually" fallbacks instead of a black screen.
- The PWA manifest and `apple-mobile-web-app-*` tags in `index.html` are inert inside the native shell; they only affect the web build and can stay.
