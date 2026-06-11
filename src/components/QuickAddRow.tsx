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
 * Add Item Pad — collapsed dashed slot that expands into a high-density
 * stationery card with name+qty+submit on row 1, note · tag on row 2,
 * and a full-width forest "add item" button on row 3.
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
        className="block w-full rounded-xl border border-dashed border-[hsl(20_40%_18%/0.55)] bg-surface-raised py-3.5 text-center font-mono text-[13px] lowercase tracking-tight text-foreground transition-colors hover:bg-surface"
      >
        [ + add a new item ]
      </button>
    );
  }

  return (
    <div className="animate-fade-rise rounded-xl border border-forest bg-surface-raised p-3 space-y-2.5">
      {/* Row 1: name + qty + enter */}
      <div className="flex items-center gap-2">
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
        <div className="flex items-center font-mono text-[13px] text-foreground">
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
            className="w-7 bg-transparent text-right outline-none"
          />
          <span className="text-muted-foreground">x</span>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void commit()}
          disabled={!name.trim()}
          className="font-mono text-[11px] lowercase tracking-wide text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          [ enter ]
        </button>
      </div>

      {/* Row 2: note · tag */}
      <div className="flex items-center gap-2 pl-0.5">
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
          className="flex-1 min-w-0 bg-transparent font-display italic text-[12px] text-muted-foreground placeholder:text-muted-foreground/60 outline-none"
        />
        <span className="text-muted-foreground/60 text-[12px]">·</span>
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
                  // commit using the just-set tag value
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
            placeholder="tag (optional)"
            className="w-[88px] bg-transparent font-mono text-[11px] lowercase text-muted-foreground placeholder:text-muted-foreground/60 outline-none text-right"
          />
        )}
      </div>

      {/* Row 3: add item button */}
      <button
        type="button"
        onClick={() => void commit()}
        disabled={!name.trim()}
        className="block w-full h-10 rounded-xl bg-forest text-forest-foreground px-4 font-mono text-[12px] lowercase tracking-tight hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        + add item
      </button>
    </div>
  );
}
