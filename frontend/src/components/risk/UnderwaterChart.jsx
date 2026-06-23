import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot, Label,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ASSET_THEMES } from "../../lib/constants";

const ASSET_KEYS = ["gold", "silver", "nifty", "real_estate"];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-terminal-card border border-terminal-border-hover/60 rounded-lg px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-[10px] font-mono text-fg-muted uppercase tracking-wider mb-1">{label}</p>
      {payload.map((entry) => {
        const theme = ASSET_THEMES[entry.dataKey] || { color: "#fff", label: entry.dataKey };
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.color }} />
            <span className="text-xs font-mono text-fg-secondary">{theme.label}:</span>
            <span className="text-xs font-mono font-bold" style={{ color: entry.value < -10 ? "#ff0055" : "#ff6b35" }}>
              {Number(entry.value).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function UnderwaterChart({ metrics, activeAssets }) {
  const [hoveredAsset, setHoveredAsset] = useState(null);

  const chartData = useMemo(() => {
    if (!metrics) return [];
    const maxLen = Math.max(
      ...activeAssets.map((a) => metrics[a]?.drawdowns?.length || 0)
    );
    if (maxLen === 0) return [];

    const step = Math.max(1, Math.floor(maxLen / 120));
    const result = [];

    for (let i = 0; i < maxLen; i += step) {
      const point = {};
      const firstDd = metrics[activeAssets[0]]?.drawdowns;
      if (firstDd && firstDd[i]) {
        const date = new Date(firstDd[i].timestamp);
        point.date = `${date.getMonth() + 1}/${date.getDate()}`;
      }
      activeAssets.forEach((asset) => {
        const dds = metrics[asset]?.drawdowns;
        if (dds && dds[i]) {
          point[asset] = dds[i].drawdown;
        }
      });
      if (Object.keys(point).length > 1) result.push(point);
    }
    return result;
  }, [metrics, activeAssets]);

  const maxDrawdownPoint = useMemo(() => {
    if (!metrics || activeAssets.length === 0) return null;
    let worst = { asset: null, value: 0, idx: 0 };
    activeAssets.forEach((asset) => {
      const dd = metrics[asset]?.maxDrawdown || 0;
      if (dd < worst.value) {
        worst = { asset, value: dd, idx: metrics[asset]?.maxDrawdownIdx || 0 };
      }
    });
    return worst.asset ? worst : null;
  }, [metrics, activeAssets]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="overflow-hidden border border-terminal-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Underwater Equity Curve</CardTitle>
            <div className="flex items-center gap-3">
              {activeAssets.map((a) => {
                const t = ASSET_THEMES[a];
                return (
                  <button
                    key={a}
                    onMouseEnter={() => setHoveredAsset(a)}
                    onMouseLeave={() => setHoveredAsset(null)}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-fg-secondary hover:text-fg-primary transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest mt-1">
            Drawdown from all-time portfolio peak
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {activeAssets.map((asset) => {
                    const color = ASSET_THEMES[asset]?.color || "#fff";
                    return (
                      <linearGradient key={asset} id={`dd-grad-${asset}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff0055" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#ff0055" stopOpacity={0.02} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  reversed
                  domain={["dataMin - 2", 0]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />

                {activeAssets.map((asset) => (
                  <Area
                    key={asset}
                    type="monotone"
                    dataKey={asset}
                    stroke={ASSET_THEMES[asset]?.color || "#fff"}
                    strokeWidth={hoveredAsset === asset ? 2.5 : 1.5}
                    fill={`url(#dd-grad-${asset})`}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                ))}

                {maxDrawdownPoint && (
                  <ReferenceDot
                    x={chartData[maxDrawdownPoint.idx]?.date}
                    y={maxDrawdownPoint.value}
                    r={5}
                    fill="#ff0055"
                    stroke="#ff0055"
                    strokeWidth={2}
                    isFront
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
