import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatMoney, type Currency } from "@/lib/format";
import { toast } from "sonner";

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

/**
 * True torn-paper edges. The fill polygon covers the bottom (or top) of the SVG
 * with a zig-zag boundary; the rest is transparent so the page background shows.
 */
const JaggedEdge = ({ position }: { position: "top" | "bottom" }) => {
  // 40 teeth across the width
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
      style={{ height: 10 }}
      aria-hidden
    >
      <polygon points={points.join(" ")} fill={PAPER} />
    </svg>
  );
};

const NOISE_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

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

/** Generate a random Code-128-looking barcode pattern (visual only, not scannable). */
function useBarcodePattern(seed: string) {
  return useMemo(() => {
    // Deterministic PRNG from seed so it doesn't flicker on rerender
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const rand = () => {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
    const bars: { w: number; gap: number }[] = [];
    for (let i = 0; i < 55; i++) {
      const w = 1 + Math.floor(rand() * 4); // 1-4
      const gap = 1 + Math.floor(rand() * 3); // 1-3
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
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const latestPct = useRef(0);
  const horizontal = useRef(false);
  const [dragPct, setDragPct] = useState(0);
  const [torn, setTorn] = useState(false);
  const [exporting, setExporting] = useState(false);

  const remaining = budgetCents - monthSpend;
  const over = budgetCents > 0 && remaining < 0;
  const insight = buildInsight(monthSpend, prevSpend, budgetCents, extrasCents, extrasPctOfSpend, tripCount);
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Stable-per-month seed so barcode doesn't change while the user interacts
  const barcodeSeed = `${monthStart.getFullYear()}-${monthStart.getMonth()}-${monthSpend}-${tripCount}`;

  const doExport = async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.export === "hide"),
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "grocery-receipt.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: "Monthly Grocery Summary" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "grocery-receipt.png";
        a.click();
      }
    } catch (e) {
      toast.error("Couldn't export receipt");
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setExporting(false);
      setTimeout(() => {
        setTorn(false);
        setDragPct(0);
        latestPct.current = 0;
      }, 500);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (torn || exporting) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    horizontal.current = false;
    latestPct.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null || startY.current === null || !swipeZoneRef.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!horizontal.current) {
      // Lock direction once the user clearly moves
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      horizontal.current = Math.abs(dx) > Math.abs(dy);
      if (!horizontal.current) {
        // Vertical scroll — release tracking so page can scroll
        startX.current = null;
        startY.current = null;
        return;
      }
    }
    e.preventDefault();
    const w = swipeZoneRef.current.offsetWidth;
    const pct = Math.min(1, Math.abs(dx) / w);
    latestPct.current = pct;
    setDragPct(pct);
  };
  const onPointerUp = () => {
    const pct = latestPct.current;
    startX.current = null;
    startY.current = null;
    horizontal.current = false;
    if (pct >= 0.55) {
      setTorn(true);
      setDragPct(1);
      void doExport();
    } else {
      setDragPct(0);
      latestPct.current = 0;
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Capture area: full receipt with jagged top + body + perforation + barcode + jagged bottom */}
      <div
        ref={exportRef}
        className="relative w-full max-w-sm"
        style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))" }}
      >
        <JaggedEdge position="top" />

        {/* Receipt body */}
        <div
          className="px-6 py-5 font-mono text-[13px] leading-snug text-neutral-900"
          style={{
            backgroundColor: PAPER,
            backgroundImage: NOISE_BG,
            backgroundBlendMode: "multiply",
          }}
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

        {/* Perforation + barcode (also part of capture, with swipe interaction) */}
        <div
          ref={swipeZoneRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative select-none"
          style={{
            backgroundColor: PAPER,
            backgroundImage: NOISE_BG,
            backgroundBlendMode: "multiply",
            touchAction: "pan-y",
            cursor: torn ? "default" : "grab",
            transform: torn
              ? "translateX(110%) rotate(-2deg)"
              : `translateX(${dragPct * 40}px)`,
            transition: torn
              ? "transform 350ms ease-in, opacity 350ms ease-in"
              : startX.current === null
                ? "transform 200ms ease"
                : "none",
            opacity: torn ? 0 : 1,
          }}
        >
          {/* Perforation line */}
          <div className="border-t-2 border-dashed border-neutral-400/80" />
          {/* Barcode */}
          <div className="px-6 pt-3 pb-4">
            <Barcode seed={barcodeSeed} />
          </div>

          {/* Drag progress overlay — excluded from export */}
          <div
            data-export="hide"
            className="pointer-events-none absolute inset-y-0 left-0 bg-neutral-900/5"
            style={{
              width: `${dragPct * 100}%`,
              transition: startX.current === null ? "width 200ms" : "none",
            }}
          />
        </div>

        <JaggedEdge position="bottom" />
      </div>

      <p data-export="hide" className="mt-3 text-center text-xs text-muted-foreground">
        Swipe across the barcode to tear &amp; share
      </p>
    </div>
  );
}
