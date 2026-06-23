import React, { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";
import { ASSET_THEMES } from "../../lib/constants";
import { AlertTriangle, Shield, AlertCircle, Flame } from "lucide-react";

function AnimatedNumber({ value, decimals = 1 }) {
  const [display, setDisplay] = useState("0.0");

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(v) {
        setDisplay(v.toFixed(decimals));
      },
    });
    return () => controls.stop();
  }, [value, decimals]);

  return <span className="tabular-nums">{display}</span>;
}

function MiniSparkline({ data, color }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 64;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function RiskBadge({ level }) {
  const config = {
    LOW: { icon: Shield, color: "#00f5a0", bg: "rgba(0,245,160,0.08)", border: "rgba(0,245,160,0.25)" },
    MEDIUM: { icon: AlertCircle, color: "#ffd600", bg: "rgba(255,214,0,0.08)", border: "rgba(255,214,0,0.25)" },
    HIGH: { icon: AlertTriangle, color: "#ff6b35", bg: "rgba(255,107,53,0.08)", border: "rgba(255,107,53,0.25)" },
    EXTREME: { icon: Flame, color: "#ff0055", bg: "rgba(255,0,85,0.08)", border: "rgba(255,0,85,0.25)" },
  };

  const c = config[level] || config.MEDIUM;
  const Icon = c.icon;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
      style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      <Icon size={10} />
      {level}
    </div>
  );
}

export default function RiskScoreCard({ asset, metrics, sparklineData, index = 0 }) {
  const theme = ASSET_THEMES[asset] || { color: "#fff", label: asset };
  const { var95, currentDrawdown, sharpe, riskLevel } = metrics;

  const ddPercent = Math.abs(currentDrawdown);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden p-4 border border-terminal-border/40 hover:border-terminal-border-hover/60 transition-all duration-300 group">
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: theme.color }} />

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}40` }} />
            <h4 className="font-display font-bold text-sm tracking-wide text-fg-primary">{theme.label}</h4>
          </div>
          <RiskBadge level={riskLevel} />
        </div>

        <div className="space-y-3">
          {/* VaR 95% */}
          <div>
            <span className="text-[10px] font-mono text-fg-muted uppercase tracking-widest block mb-0.5">VaR 95%</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-bold tabular-nums" style={{ color: var95 < -3 ? "#ff0055" : var95 < -1.5 ? "#ff6b35" : "#ffd600" }}>
                <AnimatedNumber value={var95} decimals={2} />
              </span>
              <span className="text-[10px] font-mono text-fg-muted">%</span>
            </div>
          </div>

          {/* Current Drawdown */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">Drawdown</span>
              <span className="font-mono text-xs font-bold tabular-nums" style={{ color: currentDrawdown < -10 ? "#ff0055" : "#ff6b35" }}>
                <AnimatedNumber value={currentDrawdown} decimals={1} />%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(ddPercent * 2.5, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${currentDrawdown < -10 ? "#ff0055" : "#ff6b35"}, ${currentDrawdown < -15 ? "#ff0055" : "#ff6b35"}88)`,
                }}
              />
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">Sharpe</span>
            <span
              className="font-mono text-sm font-bold tabular-nums"
              style={{ color: sharpe > 1 ? "#00f5a0" : sharpe > 0 ? "#ffd600" : "#ff0055" }}
            >
              <AnimatedNumber value={sharpe} decimals={2} />
            </span>
          </div>

          {/* Sparkline */}
          <div className="flex items-end justify-between pt-1 border-t border-terminal-border/20">
            <span className="text-[9px] font-mono text-fg-muted uppercase tracking-widest">30D VOL TREND</span>
            <MiniSparkline data={sparklineData} color={theme.color} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
