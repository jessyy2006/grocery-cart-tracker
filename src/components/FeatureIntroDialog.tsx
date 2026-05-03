import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt as ReceiptIcon } from "lucide-react";
import { FEATURE_INTRO_KEY } from "@/hooks/useOnboarding";

type Props = { open: boolean; onClose: () => void };

export default function FeatureIntroDialog({ open, onClose }: Props) {
  const dismiss = () => {
    localStorage.setItem(FEATURE_INTRO_KEY, "1");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <ReceiptIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">See every trip as a receipt</DialogTitle>
          <DialogDescription className="text-center">
            After each shop, head to <span className="font-medium text-foreground">Finance</span> to see a receipt-style
            summary, monthly spending, and personalized insights against your budget.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" size="lg" onClick={dismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
