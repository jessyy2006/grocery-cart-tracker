import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Sanctioned product buttons (see DESIGN.md → Buttons):
//   primaryLight    — primary CTA on light surfaces
//   primaryDark     — primary CTA on dark/camera surfaces
//   secondaryLight  — secondary / cancel
//   destructiveSoft — irreversible account-level action (pale field, red ink)
//   ghost           — inline icon controls
// `default` and `outline` are retained ONLY because shadcn ui primitives
// (calendar, pagination, alert-dialog cancel) reference them. Do not use them
// in product UI.
// Sizes: sm (36) · md (44, default) · lg (48) · icon (44). Press + focus come
// from the shared `press` / `focus-ring` utilities so buttons and tappable
// rows behave identically.
const buttonVariants = cva(
  "press focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primaryLight:
          "rounded-control bg-forest text-forest-foreground font-mono lowercase tracking-tight hover:opacity-90",
        primaryDark:
          "rounded-control border border-forest-foreground bg-transparent text-forest-foreground font-mono lowercase tracking-wide hover:bg-forest-foreground/5",
        secondaryLight:
          "rounded-control border border-forest bg-transparent text-forest font-mono lowercase tracking-tight hover:bg-forest/25 hover:text-background active:bg-forest/25 active:text-background",
        destructiveSoft:
          "rounded-control bg-destructive-soft text-destructive-soft-foreground font-mono lowercase tracking-tight hover:bg-destructive-soft/80 active:bg-destructive/20",
        ghost: "rounded-card text-sm font-semibold text-foreground hover:bg-surface-sunk",
        // shadcn-internal only — do not use in product UI:
        default: "rounded-card text-sm font-semibold bg-primary text-primary-foreground shadow-soft hover:bg-primary/92 hover:shadow-glow",
        outline: "rounded-card text-sm font-semibold border border-hairline bg-surface text-foreground hover:bg-surface-sunk",
      },
      size: {
        sm: "h-9 px-3 text-[13px]",
        md: "h-11 px-5 text-[14px]",
        lg: "h-12 px-5 text-[14px]",
        icon: "h-11 w-11",
        // shadcn-internal aliases — map onto the scale above.
        default: "h-11 px-5 text-[14px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
