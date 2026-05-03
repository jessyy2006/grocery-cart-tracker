import { useEffect, useRef } from "react";
import { startBarcodeScan, ScannerHandle } from "@/lib/device/scanner";
import { Button } from "@/components/ui/button";
import { X, Keyboard } from "lucide-react";
import { toast } from "sonner";

export const Scanner = ({
  onCode,
  onClose,
  onManualEntry,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
  onManualEntry?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<ScannerHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!videoRef.current) return;
        const h = await startBarcodeScan(videoRef.current, (code) => {
          if (cancelled) return;
          onCode(code);
        });
        handleRef.current = h;
      } catch (e: any) {
        toast.error(e.message ?? "Couldn't open camera");
        onClose();
      }
    })();
    return () => {
      cancelled = true;
      handleRef.current?.stop();
    };
  }, [onCode, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-72 rounded-2xl border-2 border-primary-foreground/80 shadow-elevated" />
      </div>
      <div className="absolute left-0 right-0 top-0 flex justify-between p-4 safe-top">
        <Button size="icon" variant="secondary" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center text-sm text-primary-foreground safe-bottom">
        Center a barcode in the frame
      </div>
    </div>
  );
};
