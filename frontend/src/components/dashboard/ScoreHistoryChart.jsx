import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Activity } from "lucide-react";

export default function ScoreHistoryChart({ data = [], color = "#00f2fe" }) {
  const formatXAxis = (tickItem) => {
    try {
      const date = new Date(tickItem);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return tickItem;
    }
  };

  const formatTooltipTime = (value) => {
    try {
      const date = new Date(value);
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const currentItem = payload[0].payload;
      return (
        <div className="border border-terminal-border bg-terminal-bg/95 backdrop-blur-md px-3.5 py-2.5 rounded-lg shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
          <p className="font-mono text-[9px] text-fg-secondary/80 mb-1">
            {formatTooltipTime(currentItem.timestamp)}
          </p>
          <div className="flex items-center gap-1.5 font-sans font-bold text-sm" style={{ color }}>
            <span>Score: {Math.round(payload[0].value)}</span>
          </div>
          <p
            className="font-mono text-[9px] font-bold mt-1"
            style={{
              color:
                currentItem.recommendation === "STRONG BUY"
                  ? "#00f5a0"
                  : currentItem.recommendation === "ACCUMULATE"
                  ? "#00b0ff"
                  : currentItem.recommendation === "HOLD"
                  ? "#ffd600"
                  : "#ff0055",
            }}
          >
            {currentItem.recommendation}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md flex flex-col overflow-hidden">
      <CardHeader className="py-4 border-b border-terminal-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-brand-nifty animate-pulse" />
          <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
            Chronological Scoring Runway
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 min-h-[220px]">
        {(!data || data.length === 0) ? (
          <div className="h-full flex items-center justify-center font-mono text-[10px] text-fg-muted">
            NO HISTORICAL EVALUATIONS LOGGED YET. WAIT FOR DATA PIPELINE TICK.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="rgba(255, 255, 255, 0.2)"
                style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
                dy={8}
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgba(255, 255, 255, 0.2)"
                style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={color}
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorScore)"
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
