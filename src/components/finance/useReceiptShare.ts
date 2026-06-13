import { useEffect, useRef, useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

/**
 * Shared tear/share machinery for receipt-style components.
 * Owns the swipe gesture, the PNG export, and the share/save dialog state.
 */
export function useReceiptShare(exportRef: RefObject<HTMLDivElement>, filename: string) {
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dxRef = useRef(0);
  const tearCompletedRef = useRef(false);
  const dialogShownRef = useRef(false);

  const [dragDx, setDragDx] = useState(0);
  const [tearDir, setTearDir] = useState<1 | -1>(1);
  const [torn, setTorn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [exportFile, setExportFile] = useState<File | null>(null);
  const [exportDataUrl, setExportDataUrl] = useState<string | null>(null);
  const [preparingExport, setPreparingExport] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const generatePng = async () => {
    if (!exportRef.current) return null;
    const source = exportRef.current;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-export="hide"]').forEach((el) => el.remove());
    clone.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
      if (el.style.height === "0px") el.style.height = "auto";
      if (el.style.transform) el.style.transform = "none";
      if (el.style.opacity === "0") el.style.opacity = "1";
      el.style.transition = "none";
      el.style.pointerEvents = "auto";
    });
    clone.style.transform = "none";
    clone.style.filter = "none";

    const width = source.offsetWidth || 384;
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;background:#ffffff;z-index:-1;`;
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    try {
      const dataUrl = await toPng(clone, { pixelRatio: 3, cacheBust: true, backgroundColor: "#ffffff" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      return { dataUrl, blob, file };
    } finally {
      wrap.remove();
    }
  };

  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    setPreparingExport(true);
    setExportFile(null);
    setExportDataUrl(null);
    (async () => {
      try {
        const out = await generatePng();
        if (cancelled || !out) return;
        setExportFile(out.file);
        setExportDataUrl(out.dataUrl);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error("Couldn't prepare receipt image");
        }
      } finally {
        if (!cancelled) setPreparingExport(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  const canNativeShare = (file: File) => {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    return Boolean(navigator.share && nav.canShare?.({ files: [file] }));
  };
  const isMobile = () =>
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleSave = async () => {
    if (busy || !exportFile || !exportDataUrl) return;
    setBusy(true);
    try {
      if (canNativeShare(exportFile)) {
        try {
          await navigator.share({ files: [exportFile], title: "Grocery Receipt" });
          toast.success("Saved receipt");
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      if (isMobile()) {
        setPreviewOpen(true);
        return;
      }
      const url = URL.createObjectURL(exportFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Saved receipt image");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save image");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (busy || !exportFile) return;
    setBusy(true);
    try {
      if (canNativeShare(exportFile)) {
        await navigator.share({
          files: [exportFile],
          title: "Grocery Summary",
          text: "My grocery receipt",
        });
      } else {
        toast.message("Sharing not supported here", {
          description: "Use Save image instead, or open in mobile Safari.",
        });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        console.error(e);
        toast.error("Couldn't share image");
      }
    } finally {
      setBusy(false);
    }
  };

  // Reset tear after dialog close
  useEffect(() => {
    if (!dialogOpen && torn && dialogShownRef.current && !previewOpen) {
      const t = setTimeout(() => {
        setTorn(false);
        setDragDx(0);
        dxRef.current = 0;
        tearCompletedRef.current = false;
        dialogShownRef.current = false;
      }, 250);
      return () => clearTimeout(t);
    }
  }, [dialogOpen, torn, previewOpen]);

  const TEAR_RATIO = 0.2;

  const triggerTearHaptics = () => {
    const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof n.vibrate === "function") n.vibrate([40, 60, 40, 60, 40]);
  };

  const finishSwipe = (forceComplete = false) => {
    if (tearCompletedRef.current) return;
    const dx = dxRef.current;
    const threshold = window.innerWidth * TEAR_RATIO;
    const completed = forceComplete || Math.abs(dx) >= threshold;
    pointerIdRef.current = null;
    if (completed) {
      tearCompletedRef.current = true;
      triggerTearHaptics();
      setTearDir(dx >= 0 ? 1 : -1);
      setTorn(true);
      window.setTimeout(() => {
        dialogShownRef.current = true;
        setDialogOpen(true);
      }, 380);
    } else {
      setDragDx(0);
      dxRef.current = 0;
    }
  };

  const stubHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (torn || busy || tearCompletedRef.current) return;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      dxRef.current = 0;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch { /* noop */ }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId || tearCompletedRef.current) return;
      const dx = e.clientX - startXRef.current;
      e.preventDefault();
      dxRef.current = dx;
      setDragDx(dx);
      const threshold = window.innerWidth * TEAR_RATIO;
      if (Math.abs(dx) >= threshold) finishSwipe(true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      finishSwipe();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      if (tearCompletedRef.current) return;
      pointerIdRef.current = null;
      setDragDx(0);
      dxRef.current = 0;
    },
  };

  const stubStyle: React.CSSProperties = {
    touchAction: "none",
    cursor: torn ? "default" : "grab",
    transform: torn
      ? `translate(${tearDir * 20}%, 160%) rotate(${tearDir * 8}deg)`
      : `translateX(${dragDx}px) rotate(${dragDx * 0.02}deg)`,
    transition: torn
      ? "transform 480ms cubic-bezier(.4,.1,.6,1), opacity 480ms ease-in"
      : pointerIdRef.current === null
        ? "transform 360ms ease, opacity 360ms ease"
        : "none",
    opacity: torn ? 0 : 1,
    willChange: "transform, opacity",
    pointerEvents: torn ? "none" : "auto",
  };

  const stubContainerHeight: number | string = torn ? 0 : "auto";

  return {
    torn,
    dialogOpen,
    setDialogOpen,
    previewOpen,
    setPreviewOpen,
    exportFile,
    exportDataUrl,
    preparingExport,
    busy,
    handleSave,
    handleShare,
    stubHandlers,
    stubStyle,
    stubContainerHeight,
  };
}
