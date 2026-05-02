// Wrapper around barcode scanning. Uses native BarcodeDetector when available
// (Chrome/Android), falls back to ZXing (works on iOS Safari).
import { BrowserMultiFormatReader } from "@zxing/browser";

export type ScannerHandle = { stop: () => void };

export async function startBarcodeScan(
  videoEl: HTMLVideoElement,
  onCode: (code: string) => void
): Promise<ScannerHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
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
