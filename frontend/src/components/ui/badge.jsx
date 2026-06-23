import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Tactical investment badges
        "strong-buy":
          "border-state-buy/30 bg-state-buy/10 text-state-buy shadow-[0_0_12px_rgba(0,245,160,0.15)] pulse-ring-active",
        accumulate:
          "border-state-accumulate/30 bg-state-accumulate/10 text-state-accumulate shadow-[0_0_12px_rgba(0,176,255,0.15)]",
        hold:
          "border-state-hold/30 bg-state-hold/10 text-state-hold shadow-[0_0_12px_rgba(255,214,0,0.15)]",
        avoid:
          "border-state-avoid/30 bg-state-avoid/10 text-state-avoid shadow-[0_0_12px_rgba(255,0,85,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
