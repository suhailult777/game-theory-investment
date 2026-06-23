import { motion } from "framer-motion";

const DEFAULT_DATA = {
  retail: { Buy: 45, Hold: 30, Sell: 25 },
  institutional: { Accumulate: 55, Hedge: 28, Distribute: 17 },
};

const SEGMENT_COLORS = {
  Buy: "#00f5a0",
  Accumulate: "#00b0ff",
  Hold: "#ffd600",
  Hedge: "#ffd600",
  Sell: "#ff0055",
  Distribute: "#ff0055",
};

function BarSegment({ label, value, color, index, total }) {
  const widthPct = (value / total) * 100;
  return (
    <motion.div
      className="relative h-full group"
      style={{ width: `${widthPct}%` }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.7, delay: 0.3 + index * 0.1, ease: "easeOut" }}
    >
      <div
        className="h-full rounded-sm transition-all duration-200"
        style={{
          backgroundColor: `${color}30`,
          borderRight: index < Object.keys(SEGMENT_COLORS).length - 1 ? "1px solid rgba(5,7,10,0.6)" : "none",
        }}
      >
        <div
          className="absolute inset-0 rounded-sm opacity-80"
          style={{ backgroundColor: `${color}18` }}
        />
      </div>
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="font-mono text-[8px] whitespace-nowrap px-1.5 py-0.5 rounded bg-[#0a0e17] border border-terminal-border text-fg-primary">
          {label} {value}%
        </span>
      </div>
    </motion.div>
  );
}

export default function StrategyDistribution({ data = DEFAULT_DATA }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-display text-xs font-bold text-fg-primary tracking-wide uppercase">
          Strategy Mix
        </h4>
        <span className="font-mono text-[8px] text-fg-muted tracking-widest uppercase">
          Current Distribution
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(data).map(([player, strategies]) => {
          const total = Object.values(strategies).reduce((s, v) => s + v, 0);
          const entries = Object.entries(strategies);

          return (
            <div key={player}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-fg-secondary font-semibold uppercase tracking-wider">
                  {player === "retail" ? "Retail" : "Institutional"}
                </span>
              </div>
              <div className="flex h-6 rounded-md overflow-hidden bg-white/[0.02] border border-terminal-border/30">
                {entries.map(([label, value], i) => (
                  <BarSegment
                    key={label}
                    label={label}
                    value={value}
                    color={SEGMENT_COLORS[label] || "#94a3b8"}
                    index={i}
                    total={total}
                  />
                ))}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {entries.map(([label, value]) => (
                  <div key={label} className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: SEGMENT_COLORS[label] || "#94a3b8" }}
                    />
                    <span className="font-mono text-[8px] text-fg-muted">
                      {label}{" "}
                      <span className="text-fg-secondary font-semibold">{value}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
