import { useEffect, useState, useRef } from "react";
import { motion, animate } from "framer-motion";

function AnimatedValue({ value, decimals = 2 }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(0);
  useEffect(() => {
    const controls = animate(animRef.current, value, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => {
        animRef.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value]);
  return <span className="tabular-nums">{display.toFixed(decimals)}</span>;
}

export default function EquilibriumGauge({
  distance = 0.35,
  lambda = 1.8,
  regimeLabel = "RISK_ON",
  regimeColor = "#00f5a0",
}) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, distance));
  const dashOffset = circumference * (1 - progress);

  const gaugeColor =
    progress < 0.33
      ? "#00f5a0"
      : progress < 0.66
      ? "#a78bfa"
      : "#ff0055";

  const lambdaNormalized = Math.min(1, lambda / 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient
              id="gaugeGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#00f5a0" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#ff0055" />
            </linearGradient>
          </defs>
          <circle
            stroke="rgba(255,255,255,0.04)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <motion.circle
            stroke="url(#gaugeGrad)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-fg-primary leading-none">
            <AnimatedValue value={progress} />
          </span>
          <span className="font-mono text-[9px] text-fg-muted uppercase tracking-widest mt-1">
            NASH DISTANCE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-center">
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold tracking-wider uppercase"
            style={{
              borderColor: `${regimeColor}40`,
              backgroundColor: `${regimeColor}10`,
              color: regimeColor,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: regimeColor }}
            />
            {regimeLabel}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono text-sm font-bold text-brand-nifty tabular-nums">
            <AnimatedValue value={lambdaNormalized} decimals={2} />
          </span>
          <span className="font-mono text-[8px] text-fg-muted uppercase tracking-widest">
            QRE λ
          </span>
        </div>
      </div>
    </motion.div>
  );
}
