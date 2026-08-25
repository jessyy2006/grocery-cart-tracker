import { motion, useReducedMotion } from "framer-motion";
import { Check, ScanLine, Receipt as ReceiptIcon } from "lucide-react";

/**
 * Five looping, in-app mock demos used by the onboarding showcase.
 * They are plain components (no video assets) so they stay crisp, tiny and
 * always match the current design tokens.
 */

const LOOP = 4; // seconds — one full demo loop; the showcase plays two.

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-full w-full overflow-hidden rounded-card border border-border/70 bg-card p-4">
    {children}
  </div>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-eyebrow mb-3">{children}</p>
);

/** 1 — rows land in the list, one after another. */
export const BuildListDemo = () => {
  const reduce = useReducedMotion();
  const rows = [
    { label: "bananas", cat: "produce" },
    { label: "1% milk", cat: "dairy" },
    { label: "sourdough", cat: "bakery" },
    { label: "chicken breast", cat: "meat" },
  ];
  return (
    <Frame>
      <Eyebrow>today's list</Eyebrow>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? {} : { opacity: [0, 1, 1, 1], y: [10, 0, 0, 0] }}
            transition={{ duration: LOOP, times: [0, 0.18, 0.9, 1], delay: i * 0.35, repeat: Infinity }}
            className="flex items-baseline justify-between border-b border-border/60 pb-2"
          >
            <span className="text-body">{r.label}</span>
            <span className="text-eyebrow">{r.cat}</span>
          </motion.div>
        ))}
      </div>
    </Frame>
  );
};

/** 2 — the running cart total climbs as items get checked off. */
export const LiveTotalDemo = () => {
  const reduce = useReducedMotion();
  const steps = ["$4.20", "$11.85", "$18.40", "$24.75"];
  return (
    <Frame>
      <Eyebrow>running total</Eyebrow>
      <div className="relative h-11">
        {steps.map((s, i) => (
          <motion.span
            key={s}
            className="absolute inset-x-0 font-display text-[2.25rem] leading-none tracking-tight"
            initial={false}
            animate={
              reduce
                ? { opacity: i === steps.length - 1 ? 1 : 0 }
                : { opacity: [0, 1, 1, 0], y: [8, 0, 0, -8] }
            }
            transition={{
              duration: LOOP,
              times: [0, 0.08, 0.22, 0.3],
              delay: (i * LOOP) / steps.length,
              repeat: Infinity,
            }}
          >
            {s}
          </motion.span>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {["bananas", "1% milk", "sourdough", "chicken breast"].map((label, i) => (
          <div key={label} className="flex items-center gap-2 border-b border-border/60 pb-2">
            <motion.span
              className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-primary text-primary-foreground"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={reduce ? {} : { scale: [0, 1, 1, 1], opacity: [0, 1, 1, 1] }}
              transition={{ duration: LOOP, times: [0, 0.1, 0.9, 1], delay: (i * LOOP) / 4, repeat: Infinity }}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
            <span className="text-body text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
};

/** 3 — a scan line sweeps a barcode and the price lands. */
export const ScanDemo = () => {
  const reduce = useReducedMotion();
  return (
    <Frame>
      <Eyebrow>scan as you go</Eyebrow>
      <div className="relative h-28 overflow-hidden rounded-card bg-secondary">
        <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-6">
          {Array.from({ length: 34 }).map((_, i) => (
            <span
              key={i}
              className="h-14 rounded-[1px] bg-foreground/80"
              style={{ width: i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1 }}
            />
          ))}
        </div>
        {!reduce && (
          <motion.div
            className="absolute inset-x-0 h-[2px] bg-primary"
            animate={{ top: ["8%", "88%", "8%"] }}
            transition={{ duration: LOOP, ease: "easeInOut", repeat: Infinity }}
          />
        )}
      </div>
      <motion.div
        className="mt-4 flex items-baseline justify-between"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? {} : { opacity: [0, 0, 1, 1] }}
        transition={{ duration: LOOP, times: [0, 0.45, 0.6, 1], repeat: Infinity }}
      >
        <span className="text-body">greek yogurt</span>
        <span className="font-display text-h2">$6.49</span>
      </motion.div>
      <div className="mt-2 flex items-center gap-1.5 text-eyebrow">
        <ScanLine className="h-3 w-3" /> barcode matched
      </div>
    </Frame>
  );
};

/** 4 — a receipt slides up out of the printer. */
export const ReceiptDemo = () => {
  const reduce = useReducedMotion();
  const lines: [string, string][] = [
    ["produce", "$12.40"],
    ["dairy", "$8.15"],
    ["bakery", "$4.20"],
  ];
  return (
    <Frame>
      <Eyebrow>every trip, a receipt</Eyebrow>
      <div className="relative h-[168px] overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 rounded-card bg-secondary p-4 font-mono text-[12px]"
          initial={reduce ? false : { y: 168 }}
          animate={reduce ? {} : { y: [168, 0, 0, 168] }}
          transition={{ duration: LOOP, times: [0, 0.35, 0.85, 1], ease: "easeOut", repeat: Infinity }}
        >
          <div className="flex items-center justify-center gap-1.5 pb-2 text-eyebrow">
            <ReceiptIcon className="h-3 w-3" /> cartwise
          </div>
          {lines.map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-dashed border-border py-1">
              <span>{l}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 font-semibold">
            <span>total</span>
            <span>$24.75</span>
          </div>
        </motion.div>
      </div>
    </Frame>
  );
};

/** 5 — monthly bars grow under a budget line. */
export const HabitsDemo = () => {
  const reduce = useReducedMotion();
  const bars = [0.55, 0.72, 0.48, 0.9, 0.64, 0.38];
  return (
    <Frame>
      <Eyebrow>6-month overview</Eyebrow>
      <div className="relative flex h-40 items-end gap-2">
        <div className="absolute inset-x-0 bottom-[70%] border-t border-dashed border-primary/60" />
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-[2px] bg-primary/80"
            initial={reduce ? false : { height: 0 }}
            animate={reduce ? { height: `${h * 100}%` } : { height: ["0%", `${h * 100}%`, `${h * 100}%`, "0%"] }}
            transition={{ duration: LOOP, times: [0, 0.3, 0.85, 1], delay: i * 0.06, repeat: Infinity }}
          />
        ))}
      </div>
      <p className="mt-3 text-small text-muted-foreground">under budget 4 of 6 months</p>
    </Frame>
  );
};

export type ShowcaseBeat = {
  id: string;
  title: string;
  caption: string;
  Demo: () => JSX.Element;
};

export const SHOWCASE_BEATS: ShowcaseBeat[] = [
  {
    id: "list",
    title: "build the list.",
    caption: "Add items in seconds — we sort them into aisles for you.",
    Demo: BuildListDemo,
  },
  {
    id: "total",
    title: "watch the total.",
    caption: "See what your cart costs before you reach the till.",
    Demo: LiveTotalDemo,
  },
  {
    id: "scan",
    title: "scan as you go.",
    caption: "Point at a barcode and the price lands on your list.",
    Demo: ScanDemo,
  },
  {
    id: "receipt",
    title: "keep the receipt.",
    caption: "Every trip prints a receipt you can look back on.",
    Demo: ReceiptDemo,
  },
  {
    id: "habits",
    title: "spot the habits.",
    caption: "Months side by side, measured against your budget.",
    Demo: HabitsDemo,
  },
];
