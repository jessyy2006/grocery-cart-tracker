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
const GREEN_BG = "#13261d";
const EASE = [0.22, 1, 0.36, 1] as const;


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
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      setExiting(false);
      return;
    }
    const t = setTimeout(() => setReady(true), reduce ? 200 : 1100);
    return () => clearTimeout(t);
  }, [open, reduce]);

  const handleDismiss = () => {
    if (!ready || exiting) return;
    if (reduce) {
      onDismiss();
      return;
    }
    setExiting(true);
    setTimeout(onDismiss, 700);
  };

  const ANIMATE_FIRST = 8;
  const animatedItems = useMemo(() => {
    if (!payload) return { animated: [], rest: [] as { name: string; cents: number }[] };
    return {
      animated: payload.items.slice(0, ANIMATE_FIRST),
      rest: payload.items.slice(ANIMATE_FIRST),
    };
  }, [payload]);

  // Whole overlay (background + content) slides as one unit.
  const overlayVariants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
      }
    : {
        hidden: { y: "-100%" },
        show: { y: 0, transition: { duration: 0.75, ease: EASE } },
        exit: { y: "100%", transition: { duration: 0.7, ease: EASE } },
      };

  const listVariants = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.04, delayChildren: 0.45 } },
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          variants={overlayVariants}
          initial="hidden"
          animate={exiting ? "exit" : "show"}
          exit="exit"
          onClick={handleDismiss}
          role="dialog"
          aria-label="Trip receipt"
          style={{
            backgroundColor: GREEN_BG,
            paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
          }}
        >
          <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-4 py-4">
            <div
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
                    className="pb-5 text-center text-[10px] uppercase tracking-widest text-neutral-500"
                  >
                    Thanks for shopping
                  </motion.div>
                </motion.div>
              </div>

              <JaggedEdge position="bottom" />
            </motion.div>
          </div>

          {/* Collect receipt button */}
          <div
            className="w-full px-6 pb-4 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="lg"
              disabled={!ready}
              onClick={onDismiss}
              className="mx-auto flex w-full max-w-sm bg-foreground text-background hover:bg-foreground/90"
            >
              Collect receipt
            </Button>
          </div>
        </motion.div>

      )}
    </AnimatePresence>
  );

  return createPortal(tree, document.body);
}
