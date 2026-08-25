export const PAPER = "hsl(var(--receipt-paper))";
export const INK = "hsl(var(--receipt-ink))";

export const Divider = () => (
  <div className="my-2 border-t border-dashed border-current/40" />
);

export const Row = ({
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

/** Large stat column used in the receipt header blocks. */
export const Metric = ({
  label,
  value,
  caption,
  bordered,
}: {
  label: string;
  value: string;
  caption?: string;
  bordered?: boolean;
}) => (
  <div className={`flex flex-col gap-1 px-2 ${bordered ? "border-l border-neutral-400/50" : ""}`}>
    <div className="uppercase tracking-wider text-neutral-900">{label}</div>
    <div className="text-[20px] font-bold leading-tight tabular-nums">{value}</div>
    {caption && <div className="text-[11px] text-neutral-600">{caption}</div>}
  </div>
);

/** Label / value pair used inside the labeled receipt sections. */
export const HallRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="uppercase tracking-wider text-neutral-900">{label}</span>
    <span className="tabular-nums text-right font-bold">{value}</span>
  </div>
);

/** Bold uppercase section heading. */
export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="font-bold uppercase tracking-wider text-neutral-900">{children}</div>
);

export const JaggedEdge = ({ position }: { position: "top" | "bottom" }) => {
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
