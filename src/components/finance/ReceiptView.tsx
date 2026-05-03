import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatMoney, type Currency } from "@/lib/format";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";

type Props = {
  budgetCents: number;
  monthSpend: number;
  tripCount: number;
  avgTripCents: number;
  extrasCents: number;
  extrasCount: number;
  extrasPctOfSpend: number;
  momDelta: number | null;
  prevSpend: number;
  monthStart: Date;
  monthEnd: Date;
  currency: Currency;
};

const PAPER = "#fdfaf1";

const fmtRange = (a: Date, b: Date) => {
  const m = a.toLocaleString(undefined, { month: "long" });
  return `${m} ${a.getDate()} – ${m} ${b.getDate()}`;
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between gap-4 ${strong ? "font-bold" : ""}`}>
    <span className="uppercase tracking-wider">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

const Divider = () => <div className="my-2 border-t border-dashed border-neutral-500/60" />;

/** Transparent torn-paper edges. Polygon fills only the paper region. */
const JaggedEdge = ({ position }: { position: "top" | "bottom" }) => {
  const teeth = 40;
  const step = 400 / teeth;
  const peak = 2;
  const valley = 10;
  const points: string[] = [];
  if (position === "top") {
    points.push("0,12");
    for (let i = 0; i <= teeth; i++) {
      const x = i * step;
      const y = i % 2 === 0 ? valley : peak;
      points.push(`${x},${y}`);
    }
    points.push("400,12");
  } else {
    points.push("0,0");
    for (let i = 0; i <= teeth; i++) {
      const x = i * step;
      const y = i % 2 === 0 ? 12 - valley : 12 - peak;
      points.push(`${x},${y}`);
    }
    points.push("400,0");
  }
  return (
    <svg
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: 10, display: "block" }}
      aria-hidden
    >
      <polygon points={points.join(" ")} fill={PAPER} />
    </svg>
  );
};

function buildInsight(
  monthSpend: number,
  prevSpend: number,
  budgetCents: number,
  extrasCents: number,
  extrasPct: number,
  tripCount: number,
): string {
  if (tripCount < 2) return "Keep tracking to unlock insights.";
  if (budgetCents > 0 && monthSpend > budgetCents) {
    const over = Math.round(((monthSpend - budgetCents) / budgetCents) * 100);
    return `Spending is ${over}% over budget.`;
  }
  if (prevSpend > 0) {
    const delta = Math.round(((monthSpend - prevSpend) / prevSpend) * 100);
    if (Math.abs(delta) >= 5) {
      return delta < 0
        ? `Spending decreased ${Math.abs(delta)}% vs last month.`
        : `Spending increased ${delta}% vs last month.`;
    }
  }
  if (extrasPct > 0) return `${extrasPct}% of spending was unplanned.`;
  return "Steady spending — keep it up.";
}

function useBarcodePattern(seed: string) {
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const rand = () => {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
    const bars: { w: number; gap: number }[] = [];
    for (let i = 0; i < 55; i++) {
      const w = 1 + Math.floor(rand() * 4);
      const gap = 1 + Math.floor(rand() * 3);
      bars.push({ w, gap });
    }
    return bars;
  }, [seed]);
}

const Barcode = ({ seed }: { seed: string }) => {
  const bars = useBarcodePattern(seed);
  return (
    <div className="flex h-16 w-full items-stretch justify-center gap-0">
      {bars.map((b, i) => (
        <div key={i} className="flex items-stretch" style={{ marginRight: `${b.gap}px` }}>
          <div style={{ width: `${b.w}px`, backgroundColor: "#111" }} />
        </div>
      ))}
    </div>
  );
};

export default function ReceiptView(props: Props) {
  const {
    budgetCents,
    monthSpend,
    tripCount,
    avgTripCents,
    extrasCents,
    extrasCount,
    extrasPctOfSpend,
    momDelta,
    prevSpend,
    monthStart,
    monthEnd,
    currency,
  } = props;

  const exportRef = useRef<HTMLDivElement>(null);
  const swipeZoneRef = useRef<HTMLDivElement>(null);

  // Pointer/touch state in refs for accurate, real-time gesture tracking.
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const tearCompletedRef = useRef(false);

  const [dragDx, setDragDx] = useState(0);
  const [tearDir, setTearDir] = useState<1 | -1>(1);
  const [torn, setTorn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  

  const remaining = budgetCents - monthSpend;
  const over = budgetCents > 0 && remaining < 0;
  const insight = buildInsight(monthSpend, prevSpend, budgetCents, extrasCents, extrasPctOfSpend, tripCount);
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const barcodeSeed = `${monthStart.getFullYear()}-${monthStart.getMonth()}-${monthSpend}-${tripCount}`;

  const generatePng = async (): Promise<{ dataUrl: string; blob: Blob; file: File } | null> => {
    if (!exportRef.current) return null;
    const node = exportRef.current;
    // Switch to "exporting" state so the receipt re-mounts as a clean, untorn version
    // for capture, regardless of current torn/drag state.
    setExporting(true);
    // Wait two frames to ensure styles are applied.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: node.offsetWidth,
        height: node.offsetHeight,
        filter: (el) => {
          if (!(el instanceof HTMLElement)) return true;
          return el.dataset.export !== "hide";
        },
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "grocery-receipt.png", { type: "image/png" });
      return { dataUrl, blob, file };
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const out = await generatePng();
      if (!out) return;
      const a = document.createElement("a");
      a.href = out.dataUrl;
      a.download = "grocery-receipt.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Saved receipt image");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save image");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const out = await generatePng();
      if (!out) return;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (navigator.share && nav.canShare?.({ files: [out.file] })) {
        await navigator.share({
          files: [out.file],
          title: "Monthly Grocery Summary",
          text: "My grocery receipt",
        });
      } else {
        toast.message("Sharing not supported here", {
          description: "Use Save image instead, or open in mobile Safari.",
        });
      }
    } catch (e) {
      // Cancelled share is fine
      if ((e as Error)?.name !== "AbortError") {
        console.error(e);
        toast.error("Couldn't share image");
      }
    } finally {
      setBusy(false);
    }
  };

  // Reset tear when dialog closes
  useEffect(() => {
    if (!dialogOpen && torn) {
      const t = setTimeout(() => {
        setTorn(false);
        setDragDx(0);
        dxRef.current = 0;
        tearCompletedRef.current = false;
      }, 250);
      return () => clearTimeout(t);
    }
  }, [dialogOpen, torn]);

  const TEAR_RATIO = 0.2;

  const onPointerDown = (e: React.PointerEvent) => {
    if (torn || busy || tearCompletedRef.current) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dxRef.current = 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* noop */ }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId || tearCompletedRef.current) return;
    const dx = e.clientX - startXRef.current;
    e.preventDefault();
    dxRef.current = dx;
    setDragDx(dx);
    const threshold = window.innerWidth * TEAR_RATIO;
    if (Math.abs(dx) >= threshold) {
      finishSwipe(true);
    }
  };

  const triggerTearHaptics = () => {
    const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof n.vibrate === "function") {
      n.vibrate([40, 60, 40, 60, 40]);
    }
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
      window.setTimeout(() => setDialogOpen(true), 380);
    } else {
      setDragDx(0);
      dxRef.current = 0;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    finishSwipe();
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (tearCompletedRef.current) return;
    pointerIdRef.current = null;
    setDragDx(0);
    dxRef.current = 0;
  };

  // Stub transform — visible barcode piece below perforation.
  // While exporting, force untorn appearance so PNG includes the barcode cleanly.
  const stubTransform = exporting
    ? "none"
    : torn
      ? `translate(${tearDir * 160}%, 120%) rotate(${tearDir * 14}deg)`
      : `translateX(${dragDx}px) rotate(${dragDx * 0.02}deg)`;
  const stubTransition = exporting
    ? "none"
    : torn
      ? "transform 520ms cubic-bezier(.4,.1,.6,1), opacity 520ms ease-in"
      : pointerIdRef.current === null
        ? "transform 220ms ease"
        : "none";
  const stubOpacity = exporting ? 1 : torn ? 0 : 1;
  const stubContainerHeight = exporting ? "auto" : torn ? 0 : "auto";

  return (
    <div className="flex flex-col items-center">
      {/* Receipt assembly — captured for export */}
      <div
        ref={exportRef}
        className="relative w-full max-w-sm overflow-hidden"
        style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))" }}
      >
        <JaggedEdge position="top" />

        {/* Body */}
        <div
          className="px-6 py-5 font-mono text-[13px] leading-snug text-neutral-900"
          style={{ backgroundColor: PAPER }}
        >
          <div className="text-center">
            <div className="text-base font-bold uppercase tracking-widest">
              Monthly Grocery Summary
            </div>
            <div className="mt-1 text-xs text-neutral-600">{fmtRange(monthStart, monthEnd)}</div>
          </div>

          <Divider />
          <Row label="Budget" value={budgetCents > 0 ? formatMoney(budgetCents, currency) : "—"} />
          <Row label="Spent" value={formatMoney(monthSpend, currency)} />
          <Divider />
          {budgetCents > 0 ? (
            over ? (
              <Row label="Over Budget" value={formatMoney(-remaining, currency)} strong />
            ) : (
              <Row label="Remaining" value={formatMoney(remaining, currency)} strong />
            )
          ) : (
            <Row label="Remaining" value="—" strong />
          )}
          <Divider />
          <Row label="Trips" value={String(tripCount)} />
          <Row label="Avg / Trip" value={formatMoney(avgTripCents, currency)} />
          <Row label="Extras" value={formatMoney(extrasCents, currency)} />
          <Row label="Extra Items" value={String(extrasCount)} />
          {momDelta !== null && (
            <Row
              label="VS Last Month"
              value={`${momDelta < 0 ? "-" : "+"}${formatMoney(Math.abs(momDelta), currency)}`}
            />
          )}
          <Divider />
          <div className="my-2 text-center text-xs italic text-neutral-700">* {insight} *</div>
          <div className="mt-3 text-center text-[10px] uppercase tracking-widest text-neutral-500">
            Generated {generated}
          </div>
        </div>

        {/* Perforation line — stays attached to receipt */}
        <div style={{ backgroundColor: PAPER }}>
          <div className="border-t-2 border-dashed border-neutral-400/80" />
        </div>

        {/* Stub container — positioned so the stub can animate away */}
        <div className="relative" style={{ height: torn ? 0 : "auto", transition: "height 380ms ease" }}>
          {/* Export-only stub: shown while capturing so the saved PNG includes the barcode */}
          <div
            data-export="hide-inverse"
            aria-hidden
            className="pointer-events-none"
            style={{
              backgroundColor: PAPER,
              visibility: "hidden",
            }}
          >
            <div className="px-6 pt-3 pb-4">
              <Barcode seed={barcodeSeed} />
            </div>
            <JaggedEdge position="bottom" />
          </div>

          {/* Visible interactive stub */}
          <div
            ref={swipeZoneRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            data-export="hide"
            className="absolute inset-x-0 top-0 select-none"
            style={{
              backgroundColor: PAPER,
              touchAction: "none",
              cursor: torn ? "default" : "grab",
              transform: stubTransform,
              transition: stubTransition,
              opacity: torn ? 0 : 1,
              willChange: "transform, opacity",
            }}
          >
            <div className="px-6 pt-3 pb-4">
              <Barcode seed={barcodeSeed} />
            </div>
            <JaggedEdge position="bottom" />
          </div>
        </div>
      </div>

      <p data-export="hide" className="mt-3 text-center text-xs text-muted-foreground">
        Swipe across the barcode to tear &amp; share
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt ready</DialogTitle>
            <DialogDescription>
              Save the receipt image to your device, or share it through your phone's share sheet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleSave} disabled={busy}>
              <Download className="h-4 w-4" />
              Save image
            </Button>
            <Button onClick={handleShare} disabled={busy}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
