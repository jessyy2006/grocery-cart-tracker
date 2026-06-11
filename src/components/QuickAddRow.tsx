import { useEffect, useRef, useState } from "react";
import { TagSelector } from "@/components/TagSelector";

export interface QuickAddSubmit {
  name: string;
  note: string;
  tag: string | null;
}

interface QuickAddRowProps {
  onSubmit: (v: QuickAddSubmit) => Promise<void> | void;
  tagSuggestions?: string[];
  placeholder?: string;
}

/**
 * Stationery-style inline quick-add row.
 * Top row: bare lowercase text prompt for the item name.
 * On focus, expands a secondary row with note + tag pills.
 * Enter commits and resets.
 */
export function QuickAddRow({
  onSubmit,
  tagSuggestions = [],
  placeholder = "+ add item...",
}: QuickAddRowProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const expanded = focused || name.length > 0;

  const reset = () => {
    setName("");
    setNote("");
    setTag(null);
  };

  const commit = async () => {
    const v = name.trim();
    if (!v) return;
    await onSubmit({ name: v, note: note.trim(), tag });
    reset();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="border-b border-[hsl(20_40%_18%/0.3)] pb-2">
      <div className="flex items-center gap-2 py-1.5">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
            if (e.key === "Escape") reset();
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent font-mono text-[14px] lowercase tracking-tight text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
        {name.trim() && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commit()}
            className="font-mono text-[11px] lowercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            [ enter ]
          </button>
        )}
      </div>

      {expanded && (
        <div className="animate-fade-in space-y-1.5 pl-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              }
            }}
            maxLength={25}
            placeholder="note (optional)"
            className="w-full bg-transparent font-display italic text-[12px] text-muted-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <div onMouseDown={(e) => e.preventDefault()}>
            <TagSelector value={tag} suggestions={tagSuggestions} onChange={setTag} />
          </div>
        </div>
      )}
    </div>
  );
}
