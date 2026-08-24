// Wrapper around barcode scanning. Uses native BarcodeDetector when available
// (Chrome/Android), falls back to ZXing (works on iOS Safari).
import { BrowserMultiFormatReader } from "@zxing/browser";
import { isNative } from "@/lib/native";

export type ScannerHandle = { stop: () => void };

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/** True only for the Lovable web preview iframe — never inside the native shell. */
export const inPreviewIframe = () => !isNative() && isInIframe();

const cameraAllowedByPolicy = () => {
  // featurePolicy / permissionsPolicy is available in modern browsers
  const doc = document as Document & {
    featurePolicy?: { allowsFeature: (name: string) => boolean };
    permissionsPolicy?: { allowsFeature: (name: string) => boolean };
  };
  const fp = doc.permissionsPolicy ?? doc.featurePolicy;
  if (!fp || typeof fp.allowsFeature !== "function") return true; // can't tell — assume yes
  return fp.allowsFeature("camera");
};

/**
 * Opens the rear camera with one shared, user-readable error path.
 * Both the barcode scanner and the receipt scanner go through this.
 */
export async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not supported on this device.");
  }
  if (inPreviewIframe() && !cameraAllowedByPolicy()) {
    throw new Error(
      "Camera blocked by the preview. Open the app in a new tab (or on your phone) to scan."
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch (err) {
    const e = err as DOMException;
    if (e.name === "NotAllowedError") {
      if (isNative()) {
        throw new Error(
          "Camera access is off. Enable it in Settings › CartWise › Camera, or enter details manually."
        );
      }
      if (inPreviewIframe()) {
        throw new Error(
          "Camera blocked in preview. Open the app in a new tab to allow camera access."
        );
      }
      throw new Error("Camera permission denied. Enable it in your browser settings.");
    }
    if (e.name === "NotFoundError") throw new Error("No camera found on this device.");
    if (e.name === "NotReadableError") throw new Error("Camera is in use by another app.");
    throw new Error(e.message || "Couldn't open camera.");
  }
}

export async function startBarcodeScan(
  videoEl: HTMLVideoElement,
  onCode: (code: string) => void
): Promise<ScannerHandle> {
  const stream = await openCameraStream();
  videoEl.srcObject = stream;
  await videoEl.play();

  let stopped = false;
  let raf = 0;
  let zxingControls: { stop: () => void } | null = null;
  let lastCode = "";
  let lastAt = 0;

  const emit = (code: string) => {
    const now = Date.now();
    if (code === lastCode && now - lastAt < 1500) return;
    lastCode = code;
    lastAt = now;
    onCode(code);
  };

  // @ts-expect-error vendor API not in TS lib
  const NativeDetector = window.BarcodeDetector;
  if (NativeDetector) {
    const detector = new NativeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
    });
    const tick = async () => {
      if (stopped) return;
      try {
        const codes = await detector.detect(videoEl);
        if (codes?.[0]?.rawValue) emit(codes[0].rawValue);
      } catch {
        /* ignore frame errors */
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  } else {
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromStream(stream, videoEl, (result) => {
      if (result) emit(result.getText());
    });
    zxingControls = { stop: () => controls.stop() };
  }

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    },
  };
}
