import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { formatMoney, type Currency } from "@/lib/format";
import { Button } from "@/components/ui/button";


export type TripReceiptPayload = {
  storeName: string;
  date: Date;
  items: { name: string; cents: number }[];
  extraCount: number;
  totalCents: number;
  pctOfBudget: number | null;
  biggestCategory: string | null;
  streak: number;
  currency: Currency;
};

const PAPER = "#fdfaf1";
const INK = "#0e1a14";


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
    points.push("400,0");
    for (let i = teeth; i >= 0; i--) {
      const x = i * step;
      const y = i % 2 === 0 ? 12 - valley : 12 - peak;
      points.push(`${x},${y}`);
    }
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

const Row = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div className={`flex justify-between gap-4 ${strong ? "font-bold" : ""}`}>
    <span className="uppercase tracking-wider">{label}</span>
    <span className="tabular-nums text-right">{value}</span>
  </div>
);

const Divider = () => (
  <div className="my-2 border-t border-dashed border-neutral-500/60" />
);

const fmtDateTime = (d: Date) => {
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
};

interface Props {
  open: boolean;
  payload: TripReceiptPayload | null;
  onDismiss: () => void;
}

export default function PrintedReceiptOverlay({ open, payload, onDismiss }: Props) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), reduce ? 200 : 1100);
    return () => clearTimeout(t);
  }, [open, reduce]);

  const ANIMATE_FIRST = 8;
  const animatedItems = useMemo(() => {
    if (!payload) return { animated: [], rest: [] as { name: string; cents: number }[] };
    return {
      animated: payload.items.slice(0, ANIMATE_FIRST),
      rest: payload.items.slice(ANIMATE_FIRST),
    };
  }, [payload]);

  const containerVariants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { y: "-110%" },
        show: {
          y: 0,
          transition: { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.8 },
        },
      };

  const listVariants = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.04, delayChildren: 0.25 } },
      };

  const rowVariants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.18 } } }
    : {
        hidden: { opacity: 0, y: -6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" as const } },
      };

  if (typeof document === "undefined") return null;

  const tree = (
    <AnimatePresence>
      {open && payload && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center overflow-hidden bg-foreground/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => ready && onDismiss()}
          role="dialog"
          aria-label="Trip receipt"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
          }}
        >
          <div className="pointer-events-none mb-2 h-1.5 w-28 rounded-full bg-foreground/50" />

          <div className="relative flex w-full flex-1 items-start justify-center overflow-hidden px-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="relative flex max-h-full w-full max-w-sm flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <JaggedEdge position="top" />

              {/* Body */}
              <div
                className="flex min-h-0 flex-1 flex-col font-mono text-[13px] leading-snug"
                style={{ backgroundColor: PAPER, color: INK }}
              >
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="flex min-h-0 flex-1 flex-col px-6 pt-5"
                >
                  {/* Header */}
                  <motion.div variants={rowVariants} className="text-center">
                    <div className="text-base font-bold uppercase tracking-widest">
                      {payload.storeName}
                    </div>
                    <div className="mt-1 text-xs text-neutral-600">
                      {fmtDateTime(payload.date)}
                    </div>
                  </motion.div>

                  <motion.div variants={rowVariants}><Divider /></motion.div>

                  <motion.div variants={rowVariants}>
                    <Row
                      label="Items"
                      value={String(payload.items.length + payload.extraCount)}
                    />
                  </motion.div>

                  {/* Scrollable items section */}
                  <div
                    className="min-h-0 flex-1 overflow-y-auto py-1"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {animatedItems.animated.map((it, i) => (
                      <motion.div key={`a-${i}`} variants={rowVariants}>
                        <div className="flex justify-between gap-4">
                          <span className="truncate pr-2">{it.name}</span>
                          <span className="tabular-nums text-right">
                            {formatMoney(it.cents, payload.currency)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    {animatedItems.rest.map((it, i) => (
                      <div
                        key={`r-${i}`}
                        className="flex justify-between gap-4 animate-fade-in"
                      >
                        <span className="truncate pr-2">{it.name}</span>
                        <span className="tabular-nums text-right">
                          {formatMoney(it.cents, payload.currency)}
                        </span>
                      </div>
                    ))}
                    {payload.extraCount > 0 && (
                      <div className="mt-1">
                        <Row label="Extra Items" value={String(payload.extraCount)} />
                      </div>
                    )}
                  </div>

                  {/* Totals + insights (fixed) */}
                  <motion.div variants={rowVariants}><Divider /></motion.div>

                  <motion.div variants={rowVariants}>
                    <Row
                      label="Total Spent"
                      value={formatMoney(payload.totalCents, payload.currency)}
                      strong
                    />
                  </motion.div>
                  <motion.div variants={rowVariants}>
                    <Row
                      label="% of Budget Spent"
                      value={payload.pctOfBudget === null ? "—" : `${payload.pctOfBudget}%`}
                    />
                  </motion.div>

                  <motion.div variants={rowVariants}>
                    <div className="h-4" aria-hidden />
                  </motion.div>

                  {payload.biggestCategory && (
                    <motion.div variants={rowVariants}>
                      <Row label="Biggest Category" value={payload.biggestCategory} />
                    </motion.div>
                  )}
                  {payload.streak >= 2 && (
                    <motion.div variants={rowVariants}>
                      <Row label="Streak" value={`${payload.streak} trips`} />
                    </motion.div>
                  )}

                  <motion.div variants={rowVariants}><Divider /></motion.div>
                  <motion.div
                    variants={rowVariants}
                    className="pb-3 text-center text-[10px] uppercase tracking-widest text-neutral-500"
                  >
                    Thanks for shopping
                  </motion.div>
                </motion.div>
              </div>

              <JaggedEdge position="bottom" />

              {/* Paper-bag tab */}
              <motion.button
                type="button"
                disabled={!ready}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: ready ? 1 : 0.85, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.6, duration: 0.25 }}
                className="relative mx-auto -mt-px flex w-[78%] items-center justify-center gap-3 rounded-b-2xl px-6 pb-5 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed"
                style={{ backgroundColor: TAB, color: PAPER }}
                aria-label="Collect your receipt"
              >
                {/* Handle cutout */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: PAPER, opacity: 0.18 }}
                />
                <span>Collect your receipt</span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(tree, document.body);
}
