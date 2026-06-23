import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

const ASSET_DATA = [
  {
    key: "gold",
    label: "Gold Spot",
    ticker: "GC=F",
    color: "#e2b740",
    nashDistance: 0.22,
    signalContribution: +4.8,
    sparkline: [38, 42, 40, 45, 43, 47, 44, 48, 46, 50],
  },
  {
    key: "silver",
    label: "Silver Spot",
    ticker: "SI=F",
    color: "#94a3b8",
    nashDistance: 0.35,
    signalContribution: +2.1,
    sparkline: [30, 32, 28, 34, 31, 33, 36, 34, 37, 35],
  },
  {
    key: "nifty",
    label: "Nifty 50",
    ticker: "^NSEI",
    color: "#00f2fe",
    nashDistance: 0.58,
    signalContribution: -3.2,
    sparkline: [52, 48, 50, 46, 49, 44, 47, 43, 45, 42],
  },
  {
    key: "real_estate",
    label: "Nifty Realty",
    ticker: "^CNXREALTY",
    color: "#00f5a0",
    nashDistance: 0.71,
    signalContribution: -6.5,
    sparkline: [60, 55, 58, 52, 54, 48, 50, 45, 47, 43],
  },
];

function MiniSparkline({ data, color, width = 80, height = 24 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sparkFill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sparkFill-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AssetNashCards({ assets = ASSET_DATA }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-display text-xs font-bold text-fg-primary tracking-wide uppercase">
          Per-Asset Nash Signals
        </h4>
        <span className="font-mono text-[8px] text-fg-muted tracking-widest uppercase">
          Signal Contribution
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {assets.map((asset, i) => {
          const isPositive = asset.signalContribution > 0;
          const isZero = asset.signalContribution === 0;

          return (
            <motion.div
              key={asset.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="relative overflow-hidden rounded-xl border border-terminal-border/40 bg-terminal-card p-4 backdrop-blur-md transition-all duration-300 hover:border-terminal-border-hover/60 hover:bg-terminal-card-hover/40 cursor-default"
            >
              {/* Top accent */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: asset.color }}
              />

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h5 className="font-display text-sm font-bold text-fg-primary leading-tight">
                    {asset.label}
                  </h5>
                  <span className="font-mono text-[9px] text-fg-muted uppercase tracking-wider">
                    {asset.ticker}
                  </span>
                </div>
                <MiniSparkline data={asset.sparkline} color={asset.color} />
              </div>

              {/* Nash Distance */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] text-fg-muted uppercase tracking-wider">
                  Nash Dist
                </span>
                <span className="font-mono text-xs font-bold text-fg-primary tabular-nums">
                  {asset.nashDistance.toFixed(2)}
                </span>
              </div>

              {/* Signal Contribution */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-fg-muted uppercase tracking-wider">
                  Signal Δ
                </span>
                <div className="flex items-center gap-1">
                  {isPositive && <TrendingUp size={11} className="text-state-buy" />}
                  {!isPositive && !isZero && <TrendingDown size={11} className="text-state-avoid" />}
                  {isZero && <Minus size={11} className="text-fg-muted" />}
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      isPositive && "text-state-buy",
                      !isPositive && !isZero && "text-state-avoid",
                      isZero && "text-fg-muted"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {asset.signalContribution.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Distance bar */}
              <div className="mt-3 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: asset.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${asset.nashDistance * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
