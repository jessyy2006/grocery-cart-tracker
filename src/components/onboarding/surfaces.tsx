import { Check } from "lucide-react";

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

/** Receipt-paper surfaces (trip receipt, monthly summary) share this shell. */
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

/** 1 — the monthly summary receipt, barcode and all. */
export const MonthlySummarySurface = () => (
  <Paper>
    <div className="px-2.5 py-2.5">
      <p className="text-center font-mono text-[6.5px] font-bold uppercase tracking-[0.12em]">
        monthly grocery summary
      </p>
      <p className="mb-1.5 text-center font-mono text-[6px] opacity-50">august 1 — august 31</p>
      <div className="border-y border-dashed border-receipt-rule py-1">
        <Row k="BUDGET" v="$400.00" />
        <Row k="SPENT" v="$90.76" />
        <Row k="REMAINING" v="$309.24" bold />
      </div>
      <div className="py-1">
        <Row k="TRIPS" v="2" />
        <Row k="AVG / TRIP" v="$45.38" />
        <Row k="IMPULSE" v="$3.80" />
      </div>
      <div className="flex h-5 items-end justify-center gap-[1.5px] border-t border-dashed border-receipt-rule pt-1.5">
        {Array.from({ length: 26 }).map((_, i) => (
          <span
            key={i}
            className="h-full bg-receipt-ink/80"
            style={{ width: i % 4 === 0 ? 2 : 1 }}
          />
        ))}
      </div>
    </div>
  </Paper>
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
        <p className="mt-1.5 font-mono text-[5.5px] text-muted-foreground">
          under budget 4 of 6
        </p>
      </div>
    </Card>
  );
};

export const HERO_SURFACES = [
  MonthlySummarySurface,
  TripReceiptSurface,
  ListsSurface,
  LiveListSurface,
  FinanceSurface,
];
