import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Canonical primary buttons: `primaryLight` (solid) and `primaryDark` (outlined,
// for use on dark `forest` surfaces). These are the ONLY two primary styles
// allowed in the app. Other variants below are for non-primary (secondary,
// destructive, ghost) actions.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background [transition:transform_150ms_ease-out,background-color_180ms_ease-out,box-shadow_200ms_ease-out,color_180ms_ease-out,opacity_180ms_ease-out] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primaryLight:
          "rounded-[4px] bg-forest text-forest-foreground font-mono lowercase tracking-tight hover:opacity-90",
        primaryDark:
          "rounded-[4px] border border-forest-foreground bg-transparent text-forest-foreground font-mono lowercase tracking-wide hover:bg-forest-foreground/5",
        secondaryLight:
          "rounded-[4px] border border-forest bg-transparent text-forest font-mono lowercase tracking-tight hover:bg-forest/25 hover:text-background active:bg-forest/25 active:text-background",
        default: "rounded-lg text-sm font-semibold bg-primary text-primary-foreground shadow-soft hover:bg-primary/92 hover:shadow-glow",
        hero: "rounded-lg text-base font-semibold bg-primary text-primary-foreground shadow-raised hover:shadow-glow hover:-translate-y-[1px]",
        destructive: "rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "rounded-lg text-sm font-semibold border border-hairline bg-surface text-foreground hover:bg-surface-sunk",
        secondary: "rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-lg text-sm font-semibold text-foreground hover:bg-surface-sunk",
        quiet: "rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent",
        link: "rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline",
        glass: "rounded-lg text-sm font-semibold glass text-foreground border border-hairline hover:bg-surface",
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
