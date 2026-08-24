import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BaseProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

type Props = BaseProps &
  (
    | { trigger: ReactNode; open?: never; onOpenChange?: never }
    | { trigger?: never; open: boolean; onOpenChange: (open: boolean) => void }
  );

/**
 * Canonical destructive-confirm dialog. Use for every irreversible action
 * (delete list, remove item, discard…). See DESIGN.md → Overlays.
 *
 * Two modes:
 *  - uncontrolled: pass `trigger` (the element that opens it).
 *  - controlled: pass `open` + `onOpenChange` (e.g. when the action lives
 *    inside another component and can't host a trigger).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  trigger,
  open,
  onOpenChange,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {/* Action ranking: destructive confirm is recessive and on the left,
            the safe cancel is solid and on the right. */}
        <AlertDialogFooter className="flex-row gap-2 sm:justify-stretch">
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: "destructiveSoft", size: "lg" }), "min-w-0 flex-1")}
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel
            className={cn(buttonVariants({ variant: "primaryLight", size: "lg" }), "mt-0 min-w-0 flex-1")}
          >
            {cancelLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
