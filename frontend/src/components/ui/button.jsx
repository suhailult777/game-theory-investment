import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-white text-terminal-bg shadow hover:bg-fg-primary hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]",
        destructive:
          "bg-state-avoid text-white shadow-sm hover:bg-state-avoid/90",
        outline:
          "border border-terminal-border bg-transparent shadow-sm hover:bg-white/5 hover:text-fg-primary hover:border-terminal-border-hover",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-white/5 hover:text-fg-primary",
        link: "text-primary underline-offset-4 hover:underline",
        // Quantitative theme button
        quantum:
          "border border-brand-nifty/30 bg-brand-nifty/5 text-brand-nifty shadow-[0_0_10px_rgba(0,242,254,0.05)] hover:border-brand-nifty/60 hover:bg-brand-nifty/10 hover:shadow-[0_0_15px_rgba(0,242,254,0.15)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
