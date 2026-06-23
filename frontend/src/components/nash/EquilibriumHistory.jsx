import { motion } from "framer-motion";

const DEFAULT_HISTORY = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
  distance: 0.2 + Math.sin(i / 4) * 0.25 + Math.random() * 0.08,
  regime: i < 8 ? "RISK_ON" : i < 16 ? "TRANSITION" : "RISK_OFF",
}));

const REGIME_COLORS = {
  RISK_ON: "#00f5a0",
  RISK_OFF: "#ffd600",
  CRISIS: "#ff0055",
  TRANSITION: "#00b0ff",
};

function MiniSparkline({ data, width = 200, height = 50, color = "#a78bfa" }) {
  const values = data.map((d) => d.distance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Regime bands */}
      {data.map((d, i) => {
        if (i === 0) return null;
        const prev = data[i - 1];
        if (prev.regime !== d.regime) {
          const x = (i / (data.length - 1)) * width;
          return (
            <line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={REGIME_COLORS[d.regime] || "#94a3b8"}
              strokeWidth={1}
              opacity={0.3}
              strokeDasharray="2,3"
            />
          );
        }
        return null;
      })}

      {/* Area fill */}
      <motion.polygon
        points={areaPoints}
        fill="url(#sparkGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Line */}
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Current dot */}
      {values.length > 0 && (
        <motion.circle
          cx={(values.length - 1) / (values.length - 1) * width}
          cy={height - ((values[values.length - 1] - min) / range) * (height - 8) - 4}
          r={3}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </svg>
  );
}

export default function EquilibriumHistory({ history = DEFAULT_HISTORY }) {
  const latest = history[history.length - 1];
  const latestColor = REGIME_COLORS[latest?.regime] || "#a78bfa";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-display text-xs font-bold text-fg-primary tracking-wide uppercase">
            Equilibrium History
          </h4>
          <span className="font-mono text-[8px] text-fg-muted tracking-widest uppercase">
            24H
          </span>
        </div>
        {latest && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: latestColor }}
            />
            <span
              className="font-mono text-[9px] font-bold uppercase"
              style={{ color: latestColor }}
            >
              {latest.regime}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white/[0.02] border border-terminal-border/30 p-3">
        <MiniSparkline data={history} height={60} color="#a78bfa" />
      </div>

      <div className="flex gap-3 mt-2 flex-wrap">
        {Object.entries(REGIME_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-[7px] text-fg-muted uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
