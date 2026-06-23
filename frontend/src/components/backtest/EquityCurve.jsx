import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

const MetricBadge = ({ label, value, positive, neutral }) => (
  <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-terminal-bg/40 border border-terminal-border/30">
    <span className="text-[8px] font-mono uppercase tracking-wider text-fg-muted">{label}</span>
    <span
      className={cn(
        "text-sm font-mono font-bold",
        neutral ? "text-fg-primary" : positive ? "text-state-buy" : "text-state-avoid"
      )}
    >
      {value}
    </span>
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="border border-terminal-border bg-terminal-bg/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
        <p className="font-mono text-[9px] text-fg-secondary/80 mb-2">
          {new Date(item.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 rounded-full bg-brand-nifty" />
            <span className="text-[10px] font-mono text-fg-secondary">Model:</span>
            <span className="text-xs font-mono font-bold text-brand-nifty">
              {item.modelReturn >= 0 ? "+" : ""}
              {item.modelReturn.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 rounded-full bg-fg-muted" />
            <span className="text-[10px] font-mono text-fg-secondary">Benchmark:</span>
            <span className="text-xs font-mono font-bold text-fg-secondary">
              {item.benchmarkReturn >= 0 ? "+" : ""}
              {item.benchmarkReturn.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function EquityCurve({ data = [] }) {
  const metrics = useMemo(() => {
    if (data.length === 0) return { totalReturn: 0, annualizedReturn: 0, maxDrawdown: 0 };
    const last = data[data.length - 1];
    const totalReturn = last.modelReturn || 0;
    const benchmarkReturn = last.benchmarkReturn || 0;
    let maxDrawdown = 0;
    let peak = 0;
    for (const d of data) {
      if (d.modelReturn > peak) peak = d.modelReturn;
      const drawdown = peak - d.modelReturn;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return {
      totalReturn,
      annualizedReturn: totalReturn * 0.85,
      maxDrawdown,
      outperformance: totalReturn - benchmarkReturn,
    };
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
    >
      <Card className="border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md overflow-hidden h-full">
        <CardHeader className="py-4 border-b border-terminal-border/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-nifty" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
                Equity Curve
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full bg-brand-nifty" />
                <span className="text-[9px] font-mono text-fg-muted">MODEL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full bg-fg-muted border-dashed" style={{ borderTop: "1px dashed #475569" }} />
                <span className="text-[9px] font-mono text-fg-muted">B&H</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Performance metrics overlay */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <MetricBadge
              label="Total Return"
              value={`${metrics.totalReturn >= 0 ? "+" : ""}${metrics.totalReturn.toFixed(1)}%`}
              positive={metrics.totalReturn > 0}
              neutral={metrics.totalReturn === 0}
            />
            <MetricBadge
              label="Ann. Return"
              value={`${metrics.annualizedReturn >= 0 ? "+" : ""}${metrics.annualizedReturn.toFixed(1)}%`}
              positive={metrics.annualizedReturn > 0}
              neutral={metrics.annualizedReturn === 0}
            />
            <MetricBadge
              label="Max Drawdown"
              value={`-${metrics.maxDrawdown.toFixed(1)}%`}
              positive={false}
            />
            <MetricBadge
              label="vs B&H"
              value={`${metrics.outperformance >= 0 ? "+" : ""}${metrics.outperformance.toFixed(1)}%`}
              positive={metrics.outperformance > 0}
              neutral={metrics.outperformance === 0}
            />
          </div>

          <div className="h-[240px]">
            {data.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-[10px] text-fg-muted">
                NO EQUITY DATA AVAILABLE
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="modelGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outperformGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f5a0" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00f5a0" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="underperformGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff0055" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ff0055" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.03)"
                    vertical={false}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />

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
                    tickFormatter={(val) => `${val.toFixed(0)}%`}
                    stroke="rgba(255,255,255,0.15)"
                    style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />

                  {/* Benchmark line (dashed) */}
                  <Area
                    type="monotone"
                    dataKey="benchmarkReturn"
                    stroke="#475569"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    fill="none"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0, fill: "#475569" }}
                    animationDuration={1000}
                  />

                  {/* Model portfolio line (solid with fill) */}
                  <Area
                    type="monotone"
                    dataKey="modelReturn"
                    stroke="#00f2fe"
                    strokeWidth={2}
                    fill="url(#modelGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 0,
                      fill: "#00f2fe",
                      filter: "drop-shadow(0 0 6px #00f2fe80)",
                    }}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
