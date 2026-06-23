import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "../../lib/utils";

const ASSET_THEMES = {
  gold: { color: "#e2b740", glowColor: "226, 183, 64", label: "Gold Spot", ticker: "GC=F" },
  silver: { color: "#94a3b8", glowColor: "148, 163, 184", label: "Silver Spot", ticker: "SI=F" },
  nifty: { color: "#00f2fe", glowColor: "0, 242, 254", label: "Nifty 50", ticker: "^NSEI" },
  real_estate: { color: "#00f5a0", glowColor: "0, 245, 160", label: "Nifty Realty", ticker: "^CNXREALTY" },
};

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(value) {
        setDisplayValue(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [value]);

  return <span className="tabular-nums">{displayValue}</span>;
}

export default function AssetCard({
  asset,
  score = 50,
  recommendation = "HOLD",
  details = {},
  price = 0,
  currency = "USD",
  isActive,
  onClick,
}) {
  const theme = ASSET_THEMES[asset] || { color: "#fff", glowColor: "255,255,255", label: asset, ticker: "" };

  const formatPrice = (val, curr) => {
    if (!val) return "---";
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: curr || "USD",
      maximumFractionDigits: curr === "INR" ? 0 : 2,
    });
    return formatter.format(val);
  };

  const getRecVariant = (rec) => {
    switch (rec?.toUpperCase()) {
      case "STRONG BUY": return "strong-buy";
      case "ACCUMULATE": return "accumulate";
      case "HOLD": return "hold";
      case "AVOID": return "avoid";
      default: return "hold";
    }
  };

  const formatFactorName = (name) => {
    if (name === "usd_inr") return "USD/INR Exchange";
    if (name === "fear_index") return "India VIX";
    return name.replace(/_/g, " ");
  };

  // SVG Gauge calculations
  const radius = 24;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="cursor-pointer w-full"
    >
      <Card
        glowColor={`rgba(${theme.glowColor}, 0.25)`}
        className={cn(
          "relative overflow-hidden p-5 border border-terminal-border/40 transition-all duration-300",
          isActive
            ? "border-[var(--glow-color)] bg-terminal-card-hover/90 shadow-[0_0_30px_rgba(var(--glow-color-rgb),0.15)] ring-1 ring-[var(--glow-color)]/30"
            : "hover:border-terminal-border-hover/60 hover:bg-terminal-card-hover/40"
        )}
        style={{
          "--glow-color": theme.color,
          "--glow-color-rgb": theme.glowColor,
        }}
      >
        {/* Accent Top Border Indicator */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ backgroundColor: theme.color }}
        />

        {/* Card Header Info */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-display font-bold text-sm tracking-wide text-fg-primary">
              {theme.label}
            </h4>
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-wider">
              {theme.ticker}
            </span>
          </div>

          <div className="text-right">
            <span className="font-mono text-xs font-bold text-fg-primary block tabular-nums">
              {formatPrice(price, currency)}
            </span>
            <span className="font-mono text-[9px] text-fg-muted uppercase tracking-widest block">
              LATEST {currency}
            </span>
          </div>
        </div>

        {/* Scoring Gauge Ring & Rec Badge */}
        <div className="flex items-center gap-4 bg-white/2 border border-terminal-border/20 rounded-xl p-3.5 mb-4">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg width="56" height="56" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                stroke="rgba(255,255,255,0.03)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={radius}
                cx="28"
                cy="28"
              />
              {/* Foreground animated progress bar */}
              <motion.circle
                stroke={theme.color}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                r={radius}
                cx="28"
                cy="28"
                style={{
                  filter: `drop-shadow(0 0 4px ${theme.color})`,
                }}
              />
            </svg>
            <div className="absolute text-center">
              <span className="font-mono text-sm font-bold text-fg-primary">
                <AnimatedNumber value={score} />
              </span>
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <Badge variant={getRecVariant(recommendation)} className="w-fit">
              {recommendation || "HOLD"}
            </Badge>
            <span className="font-mono text-[9px] text-fg-muted uppercase tracking-widest mt-1">
              DECISION MATRIX SCORE
            </span>
          </div>
        </div>

        {/* Factors list */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-terminal-border/20 pt-3">
          {Object.entries(details)
            .filter(([key]) => key !== "base_score")
            .map(([key, val]) => {
              const numVal = Number(val);
              const isPositive = numVal > 0;
              const isNegative = numVal < 0;

              return (
                <div key={key} className="flex justify-between items-center text-[10px]">
                  <span className="font-sans text-fg-secondary capitalize truncate max-w-[140px]">
                    {formatFactorName(key)}
                  </span>
                  
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <span
                      className={cn(
                        "font-bold",
                        isPositive && "text-state-buy",
                        isNegative && "text-state-avoid",
                        numVal === 0 && "text-fg-muted"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {numVal}
                    </span>

                    {/* Mini trend glyphs */}
                    {isPositive && <TrendingUp size={10} className="text-state-buy" />}
                    {isNegative && <TrendingDown size={10} className="text-state-avoid" />}
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </motion.div>
  );
}
