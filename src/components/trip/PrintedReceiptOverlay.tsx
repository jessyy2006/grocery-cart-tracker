import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatMoney, type Currency } from "@/lib/format";

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
    // Allow dismiss only after the main slide finishes (~1.1s)
    const t = setTimeout(() => setReady(true), reduce ? 200 : 1100);
    return () => clearTimeout(t);
  }, [open, reduce]);

  const visibleItems = useMemo(() => {
    if (!payload) return { rows: [] as { name: string; cents: number }[], more: 0 };
    const MAX = 8;
    if (payload.items.length <= MAX) return { rows: payload.items, more: 0 };
    return { rows: payload.items.slice(0, MAX), more: payload.items.length - MAX };
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

  return (
    <AnimatePresence>
      {open && payload && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center overflow-hidden bg-foreground/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => ready && onDismiss()}
          role="dialog"
          aria-label="Trip receipt"
        >
          {/* Printer slot (visual cue at top) */}
          <div className="pointer-events-none mt-2 h-2 w-32 rounded-full bg-foreground/60 shadow-inner" />

          <div className="relative flex w-full flex-1 flex-col items-center overflow-y-auto px-4 pb-32 pt-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="relative w-full max-w-sm"
              style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.28))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <JaggedEdge position="top" />

              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="px-6 py-5 font-mono text-[13px] leading-snug"
                style={{ backgroundColor: PAPER, color: INK }}
              >
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
                  <Row label="Items" value={String(payload.items.length + payload.extraCount)} />
                </motion.div>

                {visibleItems.rows.map((it, i) => (
                  <motion.div key={i} variants={rowVariants}>
                    <div className="flex justify-between gap-4">
                      <span className="truncate pr-2">{it.name}</span>
                      <span className="tabular-nums text-right">
                        {formatMoney(it.cents, payload.currency)}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {visibleItems.more > 0 && (
                  <motion.div variants={rowVariants}>
                    <div className="text-center text-xs italic text-neutral-600">
                      + {visibleItems.more} more
                    </div>
                  </motion.div>
                )}

                {payload.extraCount > 0 && (
                  <motion.div variants={rowVariants}>
                    <Row label="Extra Items" value={String(payload.extraCount)} />
                  </motion.div>
                )}

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

                {/* Spacer row */}
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
                  className="mt-2 text-center text-[10px] uppercase tracking-widest text-neutral-500"
                >
                  Thanks for shopping
                </motion.div>
              </motion.div>

              <JaggedEdge position="bottom" />
            </motion.div>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-6"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <Button
              size="lg"
              className="pointer-events-auto h-12 w-full max-w-sm"
              disabled={!ready}
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              Done
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
