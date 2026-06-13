import { useRef, useState } from "react";
import { TagPill } from "@/components/TagPill";
import { normalizeTag } from "@/lib/tagColor";

export interface QuickAddSubmit {
  name: string;
  qty: number;
  note: string;
  tag: string | null;
}

interface QuickAddRowProps {
  onSubmit: (v: QuickAddSubmit) => Promise<void> | void;
  tagSuggestions?: string[];
  placeholder?: string;
}

/**
 * Add Item Pad — collapsed dashed slot that expands into a structured
 * box-grid stationery card: name on row 1, qty + note on row 2,
 * tag chip row, and a full-width forest "add item" button at the base.
 */
export function QuickAddRow({
  onSubmit,
}: Omit<QuickAddRowProps, "placeholder"> & { placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [qtyText, setQtyText] = useState("1");
  const [note, setNote] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setQtyText("1");
    setNote("");
    setTagQuery("");
    setTag(null);
  };

  const commit = async () => {
    const v = name.trim();
    if (!v) return;
    const qty = Math.max(1, parseInt(qtyText, 10) || 1);
    let finalTag = tag;
    if (!finalTag && tagQuery.trim()) {
      finalTag = normalizeTag(tagQuery).slice(0, 10);
    }
    await onSubmit({ name: v, qty, note: note.trim().slice(0, 25), tag: finalTag });
    reset();
    setOpen(false);
  };

  const expand = () => {
    setOpen(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={expand}
        className="block w-full rounded-card border border-dashed border-[hsl(20_40%_18%/0.55)] bg-surface-raised py-3.5 text-center font-mono text-[13px] lowercase tracking-tight text-foreground transition-colors hover:bg-surface"
      >
        [ + add a new item ]
      </button>
    );
  }

  // Shared box styling: solid paper backdrop, hairline border, forest focus ring.
  const boxBase =
    "rounded-card border bg-surface px-3 transition-colors focus-within:border-forest focus-within:border-[1.5px]";
  const boxIdle = "border-hairline";

  return (
    <div className="animate-fade-rise rounded-card border border-hairline bg-surface-raised p-3 space-y-2.5">
      {/* Row 1: item name */}
      <div className={`${boxBase} ${boxIdle} h-11 flex items-center`}>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
            if (e.key === "Escape") {
              reset();
              setOpen(false);
            }
          }}
          placeholder="item name..."
          className="flex-1 min-w-0 bg-transparent text-[14px] lowercase text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
      </div>

      {/* Row 2: qty + note */}
      <div className="flex items-stretch gap-2">
        <div className={`${boxBase} ${boxIdle} h-11 flex items-center w-16`}>
          <input
            value={qtyText}
            onChange={(e) =>
              setQtyText(e.target.value.replace(/[^\d]/g, "").slice(0, 3))
            }
            onBlur={() =>
              setQtyText((v) => String(Math.max(1, parseInt(v, 10) || 1)))
            }
            inputMode="numeric"
            aria-label="Quantity"
            className="w-full bg-transparent text-center font-mono text-[14px] text-foreground outline-none"
          />
        </div>
        <div className={`${boxBase} ${boxIdle} h-11 flex items-center flex-1 min-w-0`}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 25))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              }
            }}
            maxLength={25}
            placeholder="note (optional)"
            className="flex-1 min-w-0 bg-transparent font-display italic text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>
      </div>

      {/* Row 3: tag */}
      <div className="flex items-center gap-2 pl-1">
        <span className="font-mono text-[12px] lowercase text-muted-foreground">tag:</span>
        {tag ? (
          <TagPill tag={tag} size="xs" onRemove={() => setTag(null)} />
        ) : (
          <input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value.slice(0, 10))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const t = normalizeTag(tagQuery).slice(0, 10);
                if (t) setTag(t);
                if (name.trim()) {
                  (async () => {
                    const qty = Math.max(1, parseInt(qtyText, 10) || 1);
                    await onSubmit({
                      name: name.trim(),
                      qty,
                      note: note.trim().slice(0, 25),
                      tag: t || null,
                    });
                    reset();
                    setOpen(false);
                  })();
                }
              }
            }}
            maxLength={10}
            placeholder="add tag"
            className="flex-1 min-w-0 bg-transparent font-mono text-[12px] lowercase text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        )}
      </div>

      {/* Base: add item button */}
      <button
        type="button"
        onClick={() => void commit()}
        disabled={!name.trim()}
        className="block w-full h-11 rounded-card bg-forest text-forest-foreground px-4 font-mono text-[13px] lowercase tracking-tight hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        add item
      </button>
    </div>
  );
}
