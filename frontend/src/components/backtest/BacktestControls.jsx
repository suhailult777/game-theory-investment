import React from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { ASSET_THEMES } from "../../lib/constants";
import { Button } from "../ui/button";

const DATE_PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
  { label: "ALL", days: null },
];

export default function BacktestControls({
  activeAsset,
  onAssetChange,
  dateRange,
  onDateRangeChange,
  activePreset,
  onPresetChange,
  onNavigate,
}) {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      {/* Asset Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ASSET_THEMES).map(([key, theme]) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onAssetChange(key)}
            className={cn(
              "relative px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 border",
              activeAsset === key
                ? "border-current bg-white/5 shadow-lg"
                : "border-terminal-border bg-terminal-card/40 hover:bg-white/5 hover:border-terminal-border-hover"
            )}
            style={activeAsset === key ? { color: theme.color, borderColor: theme.color } : undefined}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.color }}
              />
              {theme.label}
            </span>
            {activeAsset === key && (
              <motion.div
                layoutId="assetGlow"
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: `0 0 20px ${theme.color}20, inset 0 0 20px ${theme.color}08`,
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Date Range Controls */}
      <div className="flex items-center gap-3">
        {/* Navigation arrows */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("prev")}
            className="h-8 w-8 text-fg-secondary hover:text-fg-primary"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("next")}
            className="h-8 w-8 text-fg-secondary hover:text-fg-primary"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Presets */}
        <div className="flex items-center bg-terminal-card/40 border border-terminal-border rounded-lg p-0.5">
          {DATE_PRESETS.map((preset) => (
            <motion.button
              key={preset.label}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onPresetChange(preset.label)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all duration-200",
                activePreset === preset.label
                  ? "bg-brand-nifty/15 text-brand-nifty border border-brand-nifty/30"
                  : "text-fg-secondary hover:text-fg-primary hover:bg-white/5"
              )}
            >
              {preset.label}
            </motion.button>
          ))}
        </div>

        {/* Date display */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terminal-card/40 border border-terminal-border">
          <Calendar size={12} className="text-fg-muted" />
          <span className="text-[10px] font-mono text-fg-secondary">
            {formatDate(dateRange.start)}
          </span>
          <span className="text-fg-muted text-[10px]">→</span>
          <span className="text-[10px] font-mono text-fg-secondary">
            {formatDate(dateRange.end)}
          </span>
        </div>
      </div>
    </div>
  );
}
