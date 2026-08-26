import { Check } from "lucide-react";
import { JaggedEdge, PAPER } from "@/components/trip/ReceiptPaper";
import { smoothPath } from "@/lib/smoothPath";

/**
 * Miniature renderings of five real Cartwise surfaces, used by the hero orbit.
 *
 * These are built from the same tokens as the product rather than captured as
 * screenshots, so they stay crisp at any density, weigh nothing, and can never
 * drift out of date with the design system the way a PNG would.
 *
 * They are decorative — the hero states what the app does in words — so each
 * one is hidden from assistive tech at the call site.
 */

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[136px] overflow-hidden rounded-card border border-border bg-card shadow-soft">
    {children}
  </div>
);

/** Receipt-paper surfaces share this shell. */
const Paper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[136px] overflow-hidden rounded-card border border-receipt-rule bg-receipt-paper text-receipt-ink shadow-soft">
    {children}
  </div>
);

const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <div
    className={`flex justify-between gap-2 font-mono text-[7px] leading-relaxed ${
      bold ? "font-bold" : ""
    }`}
  >
    <span className="truncate">{k}</span>
    <span className="shrink-0 tabular-nums">{v}</span>
  </div>
);

/**
 * 1 — the yearly receipt, cropped at the spending trend line.
 *
 * Mirrors the real `YearlyReceiptView` header: torn top edge, the same title
 * and date range, the three bordered metric columns, then Spending Behavior
 * with the monthly curve over a dashed baseline and the month initials. It
 * stops exactly where the real receipt's Hall of Fame begins.
 *
 * The curve is drawn by the same `smoothPath` the receipt itself uses, over the
 * same chart geometry, so the line's shape is the product's rather than an
 * impression of it.
 */
const FOREST = "hsl(var(--receipt-forest))";
const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** A plausible year, in cents. */
const YEAR_SERIES = [
  31200, 28400, 35100, 33800, 41200, 38600, 46900, 44100, 39500, 42800, 51300, 58700,
];

// Same geometry as YearlyReceiptView, so the curve reads identically.
const CHART_W = 320;
const CHART_H = 140;
const PAD_X = 4;
const PAD_Y = 10;

const YEAR_POINTS: [number, number][] = (() => {
  const max = Math.max(...YEAR_SERIES, 1);
  return YEAR_SERIES.map((c, i): [number, number] => [
    PAD_X + (i * (CHART_W - PAD_X * 2)) / 11,
    PAD_Y + (CHART_H - PAD_Y * 2) * (1 - c / max),
  ]);
})();

const YEAR_LINE = smoothPath(YEAR_POINTS);
const YEAR_FILL = `${YEAR_LINE} L ${YEAR_POINTS[YEAR_POINTS.length - 1][0]} ${
  CHART_H - PAD_Y
} L ${YEAR_POINTS[0][0]} ${CHART_H - PAD_Y} Z`;

const MiniDivider = () => <div className="my-1 border-t border-dashed border-current/40" />;

const MiniMetric = ({
  label,
  value,
  bordered,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) => (
  <div
    className={`flex flex-col gap-[1px] px-1 ${bordered ? "border-l border-neutral-400/50" : ""}`}
  >
    <div className="text-[4px] uppercase tracking-wider">{label}</div>
    <div className="text-[8px] font-bold leading-none tabular-nums">{value}</div>
  </div>
);

export const YearlySummarySurface = () => (
  <div className="w-[136px] overflow-hidden rounded-card border border-receipt-rule shadow-soft">
    <JaggedEdge position="top" />
    <div
      className="px-2 pb-2 font-mono text-[5px] leading-snug text-neutral-900"
      style={{ backgroundColor: PAPER }}
    >
      <div className="text-center">
        <div className="text-[6px] font-bold uppercase tracking-[0.14em]">
          Yearly Grocery Summary
        </div>
        <div className="mt-[1px] text-[4.5px] text-neutral-600">January 1 – December 31, 2026</div>
      </div>

      <MiniDivider />

      <div className="my-1 grid grid-cols-3 gap-1">
        <MiniMetric label="Total" value="$4,916" />
        <MiniMetric label="Items" value="1,284" bordered />
        <MiniMetric label="Avg Cart" value="21.4" bordered />
      </div>

      <MiniDivider />

      <div className="mt-1">
        <div className="text-[4.5px] font-bold uppercase tracking-wider">Spending Behavior</div>
        {/*
          preserveAspectRatio="none" is required here, not cosmetic. The viewBox
          is 320x140 (aspect 2.3) but this renders into roughly 120x34 (aspect
          3.5), so the default "meet" fitted the curve by height and centred it —
          the trend covered about two thirds of the width and fell out of line
          with the month initials. Stretching maps the x-axis exactly onto the
          full width; non-scaling-stroke then keeps the line an even weight
          despite the anisotropic scale that introduces.
        */}
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="mt-[2px] block w-full"
          style={{ height: 34 }}
          aria-hidden
        >
          <line
            x1={PAD_X}
            x2={CHART_W - PAD_X}
            y1={CHART_H - PAD_Y}
            y2={CHART_H - PAD_Y}
            stroke="hsl(var(--receipt-rule))"
            strokeDasharray="2 3"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path d={YEAR_FILL} fill={FOREST} opacity={0.07} />
          <path
            d={YEAR_LINE}
            fill="none"
            stroke={FOREST}
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-[1px] flex w-full justify-between px-[1px] text-[3.5px] tracking-widest text-neutral-500">
          {MONTH_LETTERS.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** 2 — a single trip's receipt. */
export const TripReceiptSurface = () => (
  <Paper>
    <div className="px-2.5 py-2.5">
      <p className="text-center font-mono text-[6px] opacity-50">thursday · jun 12</p>
      <p className="mb-1.5 text-center font-display text-[9px] italic leading-tight">
        salmon + beet salad week
      </p>
      <p className="mb-1 border-y border-dashed border-receipt-rule py-1 text-center font-mono text-[6.5px] font-bold uppercase tracking-[0.12em]">
        grocery receipt
      </p>
      <Row k="ice cream" v="$21.35" />
      <Row k="salt" v="$1.99" />
      <Row k="potatoes" v="$4.20" />
      <Row k="chicken breast" v="$23.55" />
      <div className="mt-1 border-t border-dashed border-receipt-rule pt-1">
        <Row k="TOTAL SPENT" v="$51.09" bold />
      </div>
    </div>
  </Paper>
);

/** 3 — the lists index. */
export const ListsSurface = () => (
  <Card>
    <div className="px-2.5 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[11px] leading-none">your lists</p>
        <span className="rounded-[2px] bg-primary px-1 py-[2px] font-mono text-[5.5px] text-primary-foreground">
          + new
        </span>
      </div>
      <div className="divide-y divide-hairline">
        {[
          ["walmart essentials", "21 items"],
          ["my first list", "3 items"],
          ["may 20 run", "8 items"],
          ["shrimp coconut curry", "3 items"],
        ].map(([name, count]) => (
          <div key={name} className="py-[3px]">
            <p className="truncate text-[7px] lowercase leading-tight">{name}</p>
            <p className="font-mono text-[5.5px] text-muted-foreground">{count}</p>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

/** 4 — a live list mid-trip, items ticking off. */
export const LiveListSurface = () => {
  const items: [string, string, boolean][] = [
    ["bananas", "$3.10", true],
    ["1% milk", "$5.49", true],
    ["sourdough", "$4.25", true],
    ["greek yogurt", "$6.49", false],
    ["chicken breast", "$12.80", false],
  ];
  return (
    <Card>
      <div className="px-2.5 py-2.5">
        <p className="font-mono text-[5.5px] uppercase tracking-[0.12em] text-muted-foreground">
          in cart
        </p>
        <p className="mb-1.5 font-display text-[15px] leading-none tabular-nums">$12.84</p>
        <div className="divide-y divide-hairline">
          {items.map(([name, price, done]) => (
            <div key={name} className="flex items-center gap-1 py-[3px]">
              <span
                className={`flex h-2 w-2 shrink-0 items-center justify-center rounded-[2px] ${
                  done ? "bg-primary text-primary-foreground" : "border border-hairline"
                }`}
              >
                {done && <Check className="h-[6px] w-[6px]" strokeWidth={4} />}
              </span>
              <span
                className={`flex-1 truncate text-[7px] lowercase ${
                  done ? "text-muted-foreground line-through" : ""
                }`}
              >
                {name}
              </span>
              <span className="shrink-0 font-mono text-[6px] tabular-nums text-muted-foreground">
                {price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

/** 5 — the finance page's months-against-budget chart. */
export const FinanceSurface = () => {
  const bars = [0.55, 0.72, 0.48, 0.9, 0.64, 0.38];
  return (
    <Card>
      <div className="px-2.5 py-2.5">
        <p className="font-mono text-[5.5px] uppercase tracking-[0.12em] text-muted-foreground">
          6-month overview
        </p>
        <p className="mb-2 font-display text-[15px] leading-none tabular-nums">$1,284</p>
        <div className="relative flex h-10 items-end gap-[3px]">
          <div className="absolute inset-x-0 bottom-[70%] border-t border-dashed border-primary/60" />
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[1px] bg-primary/80"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[5.5px] text-muted-foreground">under budget 4 of 6</p>
      </div>
    </Card>
  );
};

export const HERO_SURFACES = [
  YearlySummarySurface,
  TripReceiptSurface,
  ListsSurface,
  LiveListSurface,
  FinanceSurface,
];
