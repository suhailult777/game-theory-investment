import { cn } from "../../lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/5 border border-terminal-border/20",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
