import React from "react";
import { Card } from "../ui/card";
import { Activity, ShieldCheck, Flame, Landmark } from "lucide-react";
import { cn } from "../../lib/utils";

const INDICATOR_METRICS = {
  inflation: {
    icon: Flame,
    colorClass: "text-state-avoid bg-state-avoid/10 border-state-avoid/20",
    glow: "shadow-[0_0_12px_rgba(255,0,85,0.05)]",
  },
  repo: {
    icon: Landmark,
    colorClass: "text-brand-gold bg-brand-gold/10 border-brand-gold/20",
    glow: "shadow-[0_0_12px_rgba(226,183,64,0.05)]",
  },
  vix: {
    icon: Activity,
    colorClass: "text-state-accumulate bg-state-accumulate/10 border-state-accumulate/20",
    glow: "shadow-[0_0_12px_rgba(0,176,255,0.05)]",
  },
  currency: {
    icon: ShieldCheck,
    colorClass: "text-state-buy bg-state-buy/10 border-state-buy/20",
    glow: "shadow-[0_0_12px_rgba(0,245,160,0.05)]",
  },
};

export default function MacroIndicatorCard({
  type = "vix",
  title,
  value,
  description,
}) {
  const metric = INDICATOR_METRICS[type] || INDICATOR_METRICS.vix;
  const Icon = metric.icon;

  return (
    <Card
      className={cn(
        "p-4 border border-terminal-border/30 bg-terminal-card/80 backdrop-blur-md relative overflow-hidden transition-all duration-200 hover:border-terminal-border-hover/50 hover:bg-terminal-card-hover/30",
        metric.glow
      )}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="font-mono text-[9px] text-fg-secondary/80 uppercase tracking-widest block">
            {title}
          </span>
          <span className="font-display font-black text-xl tracking-tight text-fg-primary block tabular-nums">
            {value}
          </span>
          <span className="font-sans text-[10px] text-fg-muted block">
            {description}
          </span>
        </div>

        <div className={cn("p-2 border rounded-lg shrink-0", metric.colorClass)}>
          <Icon size={16} />
        </div>
      </div>

      {/* Cyber decoration dot */}
      <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-white/20" />
    </Card>
  );
}
