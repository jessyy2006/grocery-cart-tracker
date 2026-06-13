import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Sanctioned product buttons (see DESIGN.md → Buttons):
//   primaryLight  — primary CTA on light surfaces
//   primaryDark   — primary CTA on dark/forest surfaces (e.g. camera)
//   secondaryLight— secondary / cancel
//   ghost         — inline icon controls
// `default` and `outline` are retained ONLY because shadcn ui primitives
// (calendar, pagination, alert-dialog cancel) reference them. Do not use them
// in product UI. There is no `destructive` button variant — destructive intent
// is signalled by ConfirmDialog + the `destructive` color token, never a red CTA.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background [transition:transform_150ms_ease-out,background-color_180ms_ease-out,box-shadow_200ms_ease-out,color_180ms_ease-out,opacity_180ms_ease-out] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primaryLight:
          "rounded-control bg-forest text-forest-foreground font-mono lowercase tracking-tight hover:opacity-90",
        primaryDark:
          "rounded-control border border-forest-foreground bg-transparent text-forest-foreground font-mono lowercase tracking-wide hover:bg-forest-foreground/5",
        secondaryLight:
          "rounded-control border border-forest bg-transparent text-forest font-mono lowercase tracking-tight hover:bg-forest/25 hover:text-background active:bg-forest/25 active:text-background",
        ghost: "rounded-card text-sm font-semibold text-foreground hover:bg-surface-sunk",
        // shadcn-internal only — do not use in product UI:
        default: "rounded-card text-sm font-semibold bg-primary text-primary-foreground shadow-soft hover:bg-primary/92 hover:shadow-glow",
        outline: "rounded-card text-sm font-semibold border border-hairline bg-surface text-foreground hover:bg-surface-sunk",
      },
      size: {
        default: "h-11 px-5 py-2",
        compact: "h-10 px-4 text-[12px]",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-5 text-[14px]",
        xl: "h-14 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
