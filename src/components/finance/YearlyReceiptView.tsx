import { useMemo, useRef } from "react";
import { formatMoney, type Currency } from "@/lib/format";
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
import { JaggedEdge, PAPER, Divider, Row } from "@/components/trip/ReceiptPaper";
import { useReceiptShare } from "./useReceiptShare";

const FOREST = "#143F2D";

export type YearlyQuarter = {
  q: 0 | 1 | 2 | 3;
  totalCents: number;
  tripCount: number;
  topCategoryLabel: string | null;
};

type Props = {
  year: number;
  yearStart: Date;
  yearEnd: Date;
  totalOutlayCents: number;
  itemCount: number;
  avgBasket: number;
  tripCount: number;
  monthlySeries: number[]; // length 12, cents
  mostLoyalStore: string | null;
  staple: { name: string; qty: number } | null;
  largestHaul: { date: Date; cents: number } | null;
  quarters: YearlyQuarter[];
  currency: Currency;
};

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const QUARTER_META: { label: string; default: string }[] = [
  { label: "Q1 [WINTER]", default: "Stews and pantry staples. High pantry loading observed." },
  { label: "Q2 [SPRING]", default: "Fresh greens and lighter baskets dominate." },
  { label: "Q3 [SUMMER]", default: "Hydration and grilling. Seasonal peak in beverage outlay." },
  { label: "Q4 [FALL]",   default: "Holiday batches and roots. Bulk baking supplies dominate." },
];

const formatMmmDay = (d: Date) =>
  `${d.toLocaleString(undefined, { month: "short" }).toUpperCase()} ${d.getDate()}`;

// Catmull-Rom-ish smooth cubic path through points.
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  const d = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0]} ${p2[1]}`);
  }
  return d.join(" ");
}

function useBarcode(seed: string) {
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const rand = () => {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
    const bars: { w: number; gap: number }[] = [];
    for (let i = 0; i < 55; i++) {
      bars.push({ w: 1 + Math.floor(rand() * 4), gap: 1 + Math.floor(rand() * 3) });
    }
    return bars;
  }, [seed]);
}

const Barcode = ({ seed }: { seed: string }) => {
  const bars = useBarcode(seed);
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

const QUOTES = [
  "Your grocery footprint moved closer to your goals this year.",
  "Steadier baskets, sharper choices — the year reads like a quiet ledger.",
  "Small decisions, repeated weekly, shaped a meaningful year of spending.",
  "Your trips tell a story of routine, restraint, and the occasional indulgence.",
];

export default function YearlyReceiptView(props: Props) {
  const {
    year, yearStart, yearEnd,
    totalOutlayCents, itemCount, avgBasket, tripCount,
    monthlySeries, mostLoyalStore, staple, largestHaul,
    quarters, currency,
  } = props;

  const exportRef = useRef<HTMLDivElement>(null);
  const share = useReceiptShare(exportRef, "yearly-grocery-receipt.png");

  const fmtRange = `JAN 1 — DEC 31, ${year}`;
  const barcodeSeed = `${year}-${totalOutlayCents}-${tripCount}`;
  const archiveCode = `${year}—ARCHIVE—FINAL`;
  const quote = QUOTES[(year + Math.round(totalOutlayCents / 100)) % QUOTES.length];

  // Chart geometry
  const chartW = 320;
  const chartH = 140;
  const padX = 4;
  const padY = 10;
  const maxCents = Math.max(...monthlySeries, 1);
  const points: [number, number][] = monthlySeries.map((c, i) => {
    const x = padX + (i * (chartW - padX * 2)) / 11;
    const y = padY + (chartH - padY * 2) * (1 - c / maxCents);
    return [x, y];
  });
  const linePath = smoothPath(points);
  const fillPath = points.length
    ? `${linePath} L ${points[points.length - 1][0]} ${chartH - padY} L ${points[0][0]} ${chartH - padY} Z`
    : "";

  return (
    <div className="flex flex-col items-center">
      <div
        ref={exportRef}
        className="relative w-full max-w-sm"
        style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))" }}
      >
        <JaggedEdge position="top" />

        {/* Body */}
        <div
          className="px-6 py-5 font-mono text-[13px] leading-snug text-neutral-900"
          style={{ backgroundColor: PAPER }}
        >
          {/* Header */}
          <div className="text-center">
            <div className="text-base font-bold uppercase tracking-widest">
              Yearly Grocery Summary
            </div>
            <div className="mt-1 text-xs text-neutral-600">{fmtRange}</div>
          </div>

          <Divider />

          {/* Three metric columns */}
          <div className="my-3 grid grid-cols-3 gap-2">
            <Metric label="Total Outlay" value={formatMoney(totalOutlayCents, currency, 0)} />
            <Metric label="Items" value={itemCount.toLocaleString()} bordered />
            <Metric label="Avg Basket" value={avgBasket ? avgBasket.toFixed(1) : "—"} bordered />
          </div>

          <Divider />

          {/* Spending Rhythm */}
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-700">
              Spending Rhythm
            </div>
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="mt-2 block w-full"
              style={{ height: 140 }}
              aria-hidden
            >
              {/* faint baseline */}
              <line
                x1={padX} x2={chartW - padX}
                y1={chartH - padY} y2={chartH - padY}
                stroke="#d6d2c4" strokeDasharray="2 3" strokeWidth={0.6}
              />
              {totalOutlayCents > 0 && (
                <>
                  <path d={fillPath} fill={FOREST} opacity={0.07} />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={FOREST}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </svg>
            <div className="mt-1 flex w-full justify-between px-1 text-[10px] tracking-widest text-neutral-500">
              {MONTH_LETTERS.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          </div>

          <Divider />

          {/* Hall of Fame */}
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-700">
              The Hall of Fame
            </div>
            <div className="mt-2 space-y-1.5">
              {mostLoyalStore && (
                <Row label="Most Loyal Store" value={mostLoyalStore.toUpperCase()} />
              )}
              <Row
                label="Staple of the Year"
                value={staple ? `${staple.name} (${staple.qty}×)` : "—"}
              />
              <Row
                label="Largest Haul"
                value={
                  largestHaul
                    ? `${formatMmmDay(largestHaul.date)} — ${formatMoney(largestHaul.cents, currency)}`
                    : "—"
                }
              />
            </div>
          </div>

          <Divider />

          {/* Quarter blocks */}
          <div className="mt-4 space-y-4">
            {quarters.map((q) => {
              const meta = QUARTER_META[q.q];
              const insight =
                q.tripCount === 0
                  ? "No trips recorded this quarter."
                  : q.topCategoryLabel
                    ? `Focus on ${q.topCategoryLabel}. ${meta.default}`
                    : meta.default;
              return (
                <div key={q.q}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[12px] font-bold tracking-wider">{meta.label}</div>
                    <div className="text-[13px] font-bold tabular-nums">
                      {formatMoney(q.totalCents, currency, 0)}
                    </div>
                  </div>
                  <p className="mt-1 text-[12px] italic text-neutral-700">{insight}</p>
                  {q.q < 3 && (
                    <div className="mt-3 border-t border-dotted border-neutral-500/50" />
                  )}
                </div>
              );
            })}
          </div>

          <Divider />

          {/* Quote */}
          <div className="my-5 px-2 text-center">
            <p
              className="text-[15px] leading-snug text-neutral-800"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
            >
              “{quote}”
            </p>
          </div>

          <div className="mt-3 text-center text-[10px] uppercase tracking-widest text-neutral-500">
            Generated{" "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Perforation */}
        <div style={{ backgroundColor: PAPER }}>
          <div className="border-t border-dashed border-neutral-500/60" />
        </div>

        {/* Stub */}
        <div
          className="relative"
          style={{
            height: share.stubContainerHeight,
            overflow: "visible",
            transition: "height 520ms ease",
          }}
        >
          <div {...share.stubHandlers} className="select-none" style={share.stubStyle}>
            <div className="px-6 pt-3 pb-2" style={{ backgroundColor: PAPER }}>
              <Barcode seed={barcodeSeed} />
              <div className="mt-2 text-center text-[10px] tracking-[0.3em] text-neutral-600">
                {archiveCode}
              </div>
            </div>
            <JaggedEdge position="bottom" />
          </div>
        </div>
      </div>

      <p data-export="hide" className="mt-3 text-center text-xs text-muted-foreground">
        Swipe across the barcode to tear &amp; share
      </p>

      {/* Suppress unused-vars warning for yearStart/yearEnd, kept for future copy */}
      <span className="hidden" aria-hidden>
        {yearStart.toISOString()}{yearEnd.toISOString()}
      </span>

      <Dialog open={share.dialogOpen} onOpenChange={share.setDialogOpen}>
        <DialogContent className="w-[min(22rem,calc(100vw-2rem))] max-w-[22rem] mx-auto p-5 text-center sm:text-center">
          <DialogHeader className="sm:text-center">
            <DialogTitle className="sm:text-center">Receipt ready</DialogTitle>
            <DialogDescription className="sm:text-center">
              {share.preparingExport
                ? "Preparing your receipt image…"
                : "Save the receipt image to your device, or share it through your phone's share sheet."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2 sm:justify-stretch sm:space-x-0">
            <Button
              variant="secondaryLight"
              size="lg"
              className="flex-1 min-w-0"
              onClick={share.handleSave}
              disabled={share.busy || share.preparingExport || !share.exportFile}
            >
              <Download className="h-4 w-4" />
              Save image
            </Button>
            <Button
              variant="primaryLight"
              size="lg"
              className="flex-1 min-w-0"
              onClick={share.handleShare}
              disabled={share.busy || share.preparingExport || !share.exportFile}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={share.previewOpen} onOpenChange={share.setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Photos</DialogTitle>
            <DialogDescription>
              Long-press the receipt below, then choose “Save to Photos” / “Add to Photos”.
            </DialogDescription>
          </DialogHeader>
          {share.exportDataUrl && (
            <img
              src={share.exportDataUrl}
              alt="Yearly grocery receipt"
              className="mx-auto block w-full max-w-xs rounded-md"
              draggable={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 px-2 ${bordered ? "border-l border-neutral-400/50" : ""}`}>
      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-600">
        {label}
      </div>
      <div className="text-[20px] font-bold leading-tight tabular-nums">{value}</div>
    </div>
  );
}
