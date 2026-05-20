import { cn } from "@/lib/utils";
import { tagColorClass } from "@/lib/tagColor";
import { X } from "lucide-react";

interface TagPillProps {
  tag: string;
  size?: "xs" | "sm";
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function TagPill({ tag, size = "sm", onRemove, onClick, className }: TagPillProps) {
  const sizeCls = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        sizeCls,
        tagColorClass(tag),
        onClick && "cursor-pointer hover:opacity-80",
        className,
      )}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Remove tag"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
