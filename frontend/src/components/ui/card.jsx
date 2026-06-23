import React from "react";
import { cn } from "../../lib/utils";

const Card = React.forwardRef(({ className, glowColor, ...props }, ref) => (
  <div
    ref={ref}
    style={glowColor ? { "--glow-color": glowColor } : undefined}
    className={cn(
      "rounded-xl border border-terminal-border bg-terminal-card backdrop-blur-md transition-all duration-300",
      glowColor && "hover:border-[var(--glow-color)] hover:shadow-[0_0_25px_rgba(var(--glow-color-rgb),0.15)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 border-b border-terminal-border/40", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-lg font-bold leading-none tracking-tight text-fg-primary", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-fg-secondary/80", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 border-t border-terminal-border/30 mt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
