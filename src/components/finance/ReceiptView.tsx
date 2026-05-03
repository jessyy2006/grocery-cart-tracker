import { useRef, useState } from "react";
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

// Jagged edge SVG (top or bottom)
const JaggedEdge = ({ flip }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 400 12"
    preserveAspectRatio="none"
    className="block w-full"
    style={{ height: 12, transform: flip ? "scaleY(-1)" : undefined }}
    aria-hidden
  >
    <path
      d="M0,0 L0,12 L8,4 L16,11 L24,3 L32,10 L40,4 L48,11 L56,3 L64,10 L72,4 L80,11 L88,3 L96,10 L104,4 L112,11 L120,3 L128,10 L136,4 L144,11 L152,3 L160,10 L168,4 L176,11 L184,3 L192,10 L200,4 L208,11 L216,3 L224,10 L232,4 L240,11 L248,3 L256,10 L264,4 L272,11 L280,3 L288,10 L296,4 L304,11 L312,3 L320,10 L328,4 L336,11 L344,3 L352,10 L360,4 L368,11 L376,3 L384,10 L392,4 L400,11 L400,0 Z"
      fill="#fdfaf1"
    />
  </svg>
);

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

  const receiptRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [dragPct, setDragPct] = useState(0);
  const [torn, setTorn] = useState(false);
  const startX = useRef<number | null>(null);

  const remaining = budgetCents - monthSpend;
  const over = budgetCents > 0 && remaining < 0;
  const insight = buildInsight(monthSpend, prevSpend, budgetCents, extrasCents, extrasPctOfSpend, tripCount);
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const doExport = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, {
        pixelRatio: 3,
        cacheBust: true,
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
      console.error(e);
    } finally {
      setTimeout(() => {
        setTorn(false);
        setDragPct(0);
      }, 600);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (torn) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null || !stripRef.current) return;
    const w = stripRef.current.offsetWidth;
    const pct = Math.max(0, Math.min(1, (e.clientX - startX.current) / w));
    setDragPct(pct);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (dragPct >= 0.7) {
      setTorn(true);
      doExport();
    } else {
      setDragPct(0);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full max-w-sm shadow-elevated"
        style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))" }}
      >
        <JaggedEdge />
        <div
          ref={receiptRef}
          className="px-6 py-5 font-mono text-[13px] leading-snug text-neutral-900"
          style={{
            backgroundColor: "#fdfaf1",
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

          <Row
            label="Budget"
            value={budgetCents > 0 ? formatMoney(budgetCents, currency) : "—"}
          />
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

          <div className="mt-4 text-center text-[10px] uppercase tracking-widest text-neutral-500">
            Generated {generated}
          </div>
        </div>

        {/* Perforation strip + tear stub */}
        <div data-export="hide" className="relative" style={{ backgroundColor: "#fdfaf1" }}>
          <div className="border-t-2 border-dashed border-neutral-400" />
          <div
            ref={stripRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative h-8 cursor-grab select-none overflow-hidden active:cursor-grabbing"
            style={{
              backgroundColor: "#fdfaf1",
              touchAction: "pan-y",
              transform: torn
                ? "translateY(60px) rotate(-3deg)"
                : `translateX(${dragPct * 30}px) rotate(${dragPct * -1.5}deg)`,
              transition: torn ? "transform 250ms ease-in" : startX.current === null ? "transform 200ms" : "none",
              opacity: torn ? 0 : 1,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-neutral-300/60"
              style={{ width: `${dragPct * 100}%`, transition: startX.current === null ? "width 200ms" : "none" }}
            />
            <div className="relative flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-neutral-500">
              ← swipe to tear &amp; share →
            </div>
          </div>
          <JaggedEdge flip />
        </div>
      </div>

      <p data-export="hide" className="mt-3 text-center text-xs text-muted-foreground">
        Drag across the perforation to tear &amp; export
      </p>
    </div>
  );
}
