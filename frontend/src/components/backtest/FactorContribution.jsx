import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Layers } from "lucide-react";
import { cn } from "../../lib/utils";

const FACTORS = [
  { key: "inflation", label: "Inflation", color: "#ff0055" },
  { key: "currency", label: "Currency", color: "#ffd600" },
  { key: "monetary", label: "Monetary Policy", color: "#00b0ff" },
  { key: "vix", label: "VIX", color: "#ff6b35" },
  { key: "institutional", label: "Institutional", color: "#00f5a0" },
  { key: "sentiment", label: "Sentiment", color: "#a78bfa" },
  { key: "nash", label: "Nash", color: "#00f2fe" },
  { key: "qre", label: "QRE", color: "#f472b6" },
  { key: "ensemble", label: "Ensemble", color: "#34d399" },
  { key: "fp", label: "FP", color: "#fb923c" },
  { key: "ftpl", label: "FTPL", color: "#818cf8" },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="border border-terminal-border bg-terminal-bg/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.7)] max-w-[220px]">
        <p className="font-mono text-[9px] text-fg-secondary/80 mb-2">
          {new Date(item.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="space-y-1">
          {payload
            .slice()
            .reverse()
            .map((p) => (
              <div key={p.dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-[9px] font-mono text-fg-secondary">
                    {FACTORS.find((f) => f.key === p.dataKey)?.label || p.dataKey}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-fg-primary">
                  {p.value >= 0 ? "+" : ""}
                  {p.value.toFixed(1)}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function FactorContribution({ data = [] }) {
  const [hiddenFactors, setHiddenFactors] = useState(new Set());

  const toggleFactor = (key) => {
    setHiddenFactors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleFactors = FACTORS.filter((f) => !hiddenFactors.has(f.key));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
    >
      <Card className="border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="py-4 border-b border-terminal-border/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-state-accumulate" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
                Score Factor Breakdown
              </CardTitle>
            </div>

            {/* Legend with toggle */}
            <div className="flex flex-wrap gap-1.5">
              {FACTORS.map((factor) => (
                <motion.button
                  key={factor.key}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleFactor(factor.key)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider transition-all duration-200 border",
                    hiddenFactors.has(factor.key)
                      ? "border-terminal-border/20 bg-transparent text-fg-muted opacity-40"
                      : "border-transparent bg-white/[0.03] text-fg-secondary hover:bg-white/[0.06]"
                  )}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full transition-opacity"
                    style={{
                      backgroundColor: factor.color,
                      opacity: hiddenFactors.has(factor.key) ? 0.3 : 1,
                    }}
                  />
                  {factor.label}
                </motion.button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 h-[280px] sm:h-[320px]">
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center font-mono text-[10px] text-fg-muted">
               NO FACTOR DATA AVAILABLE
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                  stroke="rgba(255,255,255,0.15)"
                  style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
                  dy={8}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.15)"
                  style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />

                {visibleFactors.map((factor, i) => (
                  <Area
                    key={factor.key}
                    type="monotone"
                    dataKey={factor.key}
                    stackId="1"
                    stroke={factor.color}
                    strokeWidth={1}
                    fill={factor.color}
                    fillOpacity={0.15}
                    dot={false}
                    animationDuration={800 + i * 80}
                    animationEasing="ease-out"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
