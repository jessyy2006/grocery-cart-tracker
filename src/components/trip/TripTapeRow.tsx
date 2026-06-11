import { format } from "date-fns";
import { Money } from "@/components/Money";

interface TripTapeRowProps {
  title: string;
  date: string;
  itemCount: number;
  totalCents: number;
  onClick?: () => void;
}

export function TripTapeRow({ title, date, itemCount, totalCents, onClick }: TripTapeRowProps) {
  const sub = `${format(new Date(date), "EEE, MMM d")} · ${itemCount} item${itemCount === 1 ? "" : "s"}`.toLowerCase();
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 py-5 text-left transition-opacity hover:opacity-70"
    >
      <div className="min-w-0">
        <p className="text-[15px] font-normal lowercase text-foreground truncate">{title.toLowerCase()}</p>
        <p className="mt-0.5 text-[13px] lowercase text-muted-foreground">{sub}</p>
      </div>
      <Money cents={totalCents} size="md" className="text-foreground" />
    </button>
  );
}
