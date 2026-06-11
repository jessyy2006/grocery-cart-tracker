import { useState, useRef, useEffect } from "react";
import { Minus, Plus, Trash2, Pencil } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Market Stationery Ledger Row
 *
 * Layout (left → right):
 *   [checkbox]   item name (line 1)                qty: N    $price
 *                note (serif italic) · tag (mono)
 *
 * Strikethrough applies only to the primary item name; notes and tags remain
 * fully legible. Completed items are styled but their metadata is preserved.
 */

export interface LedgerRowProps {
  name: string;
  qty: number;
  note?: string | null;
  /** Tag rendered after note in tiny gray mono. */
  tag?: string | null;
  /** When set, replaces note line — e.g. "1 × $3.00" — rendered in serif italic. */
  multiplierLine?: string | null;
  priceCents?: number | null;
  /** Show a checkbox in the left gutter. */
  showCheckbox?: boolean;
  checked?: boolean;
  onToggle?: () => void;
  /** Make the qty bracket interactive (tap-to-expand stepper). */
  onQtyChange?: (next: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LedgerRow({
  name,
  qty,
  note,
  tag,
  multiplierLine,
  priceCents,
  showCheckbox,
  checked,
  onToggle,
  onQtyChange,
  onEdit,
  onDelete,
}: LedgerRowProps) {
  const hasSecondLine = !!multiplierLine || !!note || !!tag;

  return (
    <li className="group relative">
      <div className="flex items-stretch gap-3 py-2 pl-1 pr-1">
        {/* Checkbox — close to the left edge */}
        {showCheckbox && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={checked ? "Uncheck item" : "Check item"}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
              checked
                ? "border-forest bg-forest text-forest-foreground"
                : "border-foreground/40 bg-transparent hover:border-foreground",
            )}
          >
            {checked && (
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 6.5L5 9.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        {/* TEXT COLUMN */}
        <div className="min-w-0 flex-1 self-center pr-2">
          <p className="flex flex-wrap items-baseline gap-x-1.5 leading-snug">
            <span
              className={cn(
                "text-[15px] lowercase break-words",
                checked ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {name}
            </span>
            <span className="text-muted-foreground">·</span>
            <QtyMultiplier qty={qty} onChange={onQtyChange} />
          </p>

          {hasSecondLine && (
            <p className="mt-0.5 leading-snug">
              {multiplierLine ? (
                <span className="font-display italic text-[11px] text-muted-foreground/70">
                  {multiplierLine}
                </span>
              ) : (
                <>
                  {note && (
                    <span className="font-display italic text-[11px] text-muted-foreground/70">
                      {note}
                    </span>
                  )}
                  {note && tag && <span className="text-muted-foreground/60"> · </span>}
                  {tag && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                      {tag}
                    </span>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        {/* RIGHT COLUMN — price only */}
        <div className="flex shrink-0 items-center gap-2 self-center">
          {priceCents != null && (
            <span
              className={cn(
                "min-w-[56px] text-right font-mono text-[13px] tabular-nums",
                checked ? "font-semibold text-forest" : "text-foreground",
              )}
            >
              {formatMoney(priceCents)}
            </span>
          )}
          {(onEdit || onDelete) && (
            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Edit item"
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete item"
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          )}
        </div>

      </div>
    </li>
  );
}

function QtyMultiplier({ qty, onChange }: { qty: number; onChange?: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!onChange) {
    return (
      <span className="font-mono text-[11px] lowercase text-muted-foreground/70 tabular-nums">
        {qty}x
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[11px] lowercase text-muted-foreground/70 hover:text-foreground transition-colors tabular-nums"
        aria-label="Edit quantity"
      >
        {qty}x
      </button>
    );
  }

  return (
    <span
      ref={ref}
      className="inline-flex items-center gap-1.5 font-mono text-[12px] text-foreground"
    >
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-foreground/30 hover:border-foreground"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-5 text-center tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(qty + 1)}
        className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-foreground/30 hover:border-foreground"
      >
        <Plus className="h-3 w-3" />
      </button>
    </span>
  );
}
