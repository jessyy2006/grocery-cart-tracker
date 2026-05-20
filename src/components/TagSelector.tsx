import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { TagPill } from "@/components/TagPill";
import { normalizeTag } from "@/lib/tagColor";

interface TagSelectorProps {
  value: string | null;
  suggestions: string[];
  onChange: (next: string | null) => void;
}

export function TagSelector({ value, suggestions, onChange }: TagSelectorProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of suggestions) {
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      if (!q || k.includes(q)) out.push(s);
    }
    return out.slice(0, 8);
  }, [suggestions, query]);

  const trimmed = normalizeTag(query);
  const canCreate =
    trimmed.length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  const pick = (t: string) => {
    onChange(t);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tag:</span>
          <TagPill tag={value} onRemove={() => onChange(null)} />
        </div>
      ) : (
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 24))}
            placeholder="Add a tag (e.g. Dinner) — optional"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                pick(trimmed);
              }
            }}
          />
          {(filtered.length > 0 || canCreate) && (
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((t) => (
                <TagPill key={t} tag={t} onClick={() => pick(t)} />
              ))}
              {canCreate && (
                <button
                  type="button"
                  onClick={() => pick(trimmed)}
                  className="rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                >
                  + Create "{trimmed}"
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
