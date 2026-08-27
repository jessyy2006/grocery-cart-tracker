import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Two input treatments (see DESIGN.md → Inputs):
//   boxed     — the canonical outlined field, used everywhere in-product.
//   underline — a single rule under centred text, used only by onboarding,
//               where the screens are centred compositions with no visible
//               labels and a box would read as heavy chrome.
const inputVariants = cva(
  "flex h-12 w-full bg-transparent text-[15px] ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:italic placeholder:text-muted-foreground/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        boxed:
          "rounded-card border border-hairline px-3 py-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        // Focus is signalled on two channels — the rule takes the brand colour
        // and the field picks up a faint wash — so it never rests on hue alone.
        underline:
          "rounded-none border-0 border-b border-hairline px-1 py-2 text-center focus-visible:border-primary focus-visible:bg-primary/5",
      },
    },
    defaultVariants: { variant: "boxed" },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
