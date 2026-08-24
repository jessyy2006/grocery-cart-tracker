import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hydrateNativeSession } from "./lib/nativeSession";

// Restore any Keychain-backed auth session before the tree mounts (native only).
void hydrateNativeSession().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
