import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { PieChart, ListFilter } from "lucide-react";
import { cn } from "../../lib/utils";

const ASSET_THEMES = {
  gold: { color: "#e2b740", label: "Gold Spot" },
  silver: { color: "#94a3b8", label: "Silver Spot" },
  nifty: { color: "#00f2fe", label: "Nifty 50" },
  real_estate: { color: "#00f5a0", label: "Nifty Realty" },
};

export default function AllocationVisualizer({ allocations = {} }) {
  // Filter allocations to ignore zero weights for visual segments
  const segments = Object.entries(allocations).filter(([_, weight]) => weight > 0);

  return (
    <Card className="border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md">
      <CardHeader className="py-4">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-brand-nifty" />
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
              Portfolio Allocation Model
            </CardTitle>
            <CardDescription className="text-[10px] mt-0.5">
              Tactical Game-Theory weight distributions based on active signals
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Horizontal Stacked Bar */}
        <div className="relative h-6 w-full rounded-lg bg-white/2 border border-terminal-border/20 overflow-hidden flex shadow-inner">
          {segments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-fg-muted">
              CALCULATING PORTFOLIO MATRIX...
            </div>
          ) : (
            segments.map(([asset, weight]) => {
              const theme = ASSET_THEMES[asset] || { color: "#fff" };
              return (
                <motion.div
                  key={asset}
                  layout
                  initial={{ width: 0 }}
                  animate={{ width: `${weight}%` }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="h-full flex items-center justify-center font-mono text-[9px] font-black text-terminal-bg transition-colors"
                  style={{
                    backgroundColor: theme.color,
                    boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {weight >= 8 && `${weight}%`}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Legend grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-terminal-border/20 pt-4">
          {Object.entries(ASSET_THEMES).map(([key, theme]) => {
            const weight = allocations[key] || 0;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between border border-terminal-border/20 bg-white/2 px-2.5 py-1.5 rounded-lg transition-all duration-200",
                  weight > 0 ? "opacity-100" : "opacity-40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="font-sans text-[10px] font-medium text-fg-secondary">
                    {theme.label}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-fg-primary">
                  {weight}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
