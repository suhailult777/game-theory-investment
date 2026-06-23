import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { TrendingUp } from "lucide-react";
import { RECOMMENDATION_COLORS } from "../../lib/constants";

const ZONE_BANDS = [
  { y0: 70, y1: 100, color: RECOMMENDATION_COLORS["STRONG BUY"], label: "STRONG BUY" },
  { y0: 50, y1: 70, color: RECOMMENDATION_COLORS["ACCUMULATE"], label: "ACCUMULATE" },
  { y0: 30, y1: 50, color: RECOMMENDATION_COLORS["HOLD"], label: "HOLD" },
  { y0: 0, y1: 30, color: RECOMMENDATION_COLORS["AVOID"], label: "AVOID" },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const recColor = RECOMMENDATION_COLORS[item.recommendation] || "#94a3b8";
    return (
      <div className="border border-terminal-border bg-terminal-bg/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
        <p className="font-mono text-[9px] text-fg-secondary/80 mb-1.5">
          {new Date(item.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: recColor }} />
          <span className="font-mono text-xs font-bold" style={{ color: recColor }}>
            {item.recommendation}
          </span>
        </div>
        <p className="font-mono text-lg font-bold text-fg-primary">
          {Math.round(item.score)}
          <span className="text-[10px] text-fg-muted ml-1">/ 100</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomDot = (props) => {
  const { cx, cy, payload, index } = props;
  if (index === 0) return null;
  const prev = props.data[index - 1];
  if (!prev || prev.recommendation === payload.recommendation) return null;
  const isUpgrade =
    ["HOLD", "ACCUMULATE", "STRONG BUY"].includes(payload.recommendation) &&
    payload.score > prev.score;
  const color = isUpgrade ? RECOMMENDATION_COLORS["STRONG BUY"] : RECOMMENDATION_COLORS["AVOID"];
  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.2} />
    </g>
  );
};

export default function RecommendationTimeline({ data = [], assetColor = "#00f2fe" }) {
  const formattedData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        score: Math.round(d.score),
      })),
    [data]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="py-4 border-b border-terminal-border/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-nifty animate-pulse" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider font-display">
                Recommendation Timeline
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {ZONE_BANDS.map((band) => (
                <div key={band.label} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="text-[9px] font-mono text-fg-muted uppercase">
                    {band.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 h-[380px] sm:h-[420px]">
          {formattedData.length === 0 ? (
            <div className="h-full flex items-center justify-center font-mono text-[10px] text-fg-muted">
                  NO HISTORICAL DATA AVAILABLE
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={formattedData}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={assetColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={assetColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Zone background bands */}
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                {ZONE_BANDS.map((band) => (
                  <ReferenceArea
                    key={band.label}
                    y1={band.y0}
                    y2={band.y1}
                    fill={band.color}
                    fillOpacity={0.04}
                    stroke="none"
                  />
                ))}

                {/* Zone threshold lines */}
                <ReferenceLine y={70} stroke={RECOMMENDATION_COLORS["STRONG BUY"]} strokeDasharray="4 4" strokeOpacity={0.2} />
                <ReferenceLine y={50} stroke={RECOMMENDATION_COLORS["ACCUMULATE"]} strokeDasharray="4 4" strokeOpacity={0.2} />
                <ReferenceLine y={30} stroke={RECOMMENDATION_COLORS["HOLD"]} strokeDasharray="4 4" strokeOpacity={0.2} />

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
                  domain={[0, 100]}
                  stroke="rgba(255,255,255,0.15)"
                  style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={assetColor}
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  dot={<CustomDot data={formattedData} />}
                  activeDot={{
                    r: 5,
                    strokeWidth: 0,
                    fill: assetColor,
                    filter: `drop-shadow(0 0 6px ${assetColor}80)`,
                  }}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
