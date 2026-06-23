import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const ROW_LABELS = ["Buy", "Sell", "Hold"];
const COL_LABELS = ["Accumulate", "Distribute", "Hedge"];

const PAYOFF_MATRIX = [
  [24.5, -8.2, 6.1],
  [-12.3, 18.7, -3.4],
  [4.8, -2.1, 9.6],
];

const NASH_CELL = { row: 0, col: 0 };

function getCellColor(value, maxAbs) {
  const intensity = Math.abs(value) / maxAbs;
  if (value > 0) {
    return `rgba(0, 245, 160, ${(0.15 + intensity * 0.55).toFixed(2)})`;
  } else if (value < 0) {
    return `rgba(255, 0, 85, ${(0.15 + intensity * 0.55).toFixed(2)})`;
  }
  return "rgba(255, 255, 255, 0.03)";
}

export default function PayoffMatrix({ matrix = PAYOFF_MATRIX }) {
  const maxAbs = Math.max(...matrix.flat().map(Math.abs), 1);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-display text-xs font-bold text-fg-primary tracking-wide uppercase">
          Payoff Matrix
        </h4>
        <span className="font-mono text-[8px] text-fg-muted tracking-widest uppercase">
          Retail × Institutional
        </span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[240px]">
          {/* Column headers */}
          <div className="grid gap-[3px] mb-[3px]" style={{ gridTemplateColumns: "64px repeat(3, 1fr)" }}>
            <div />
            {COL_LABELS.map((label, ci) => (
              <div
                key={ci}
                className="text-center font-mono text-[8px] text-fg-muted uppercase tracking-wider py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {matrix.map((row, ri) => (
            <div
              key={ri}
              className="grid gap-[3px] mb-[3px]"
              style={{ gridTemplateColumns: "64px repeat(3, 1fr)" }}
            >
              <div className="flex items-center font-mono text-[9px] text-fg-secondary font-semibold pr-2 justify-end">
                {ROW_LABELS[ri]}
              </div>
              {row.map((value, ci) => {
                const isNash = ri === NASH_CELL.row && ci === NASH_CELL.col;
                return (
                  <motion.div
                    key={ci}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 + ri * 0.08 + ci * 0.06 }}
                    className={cn(
                      "relative flex items-center justify-center rounded-md py-2.5 px-1 font-mono text-xs font-bold tabular-nums transition-all duration-300",
                      isNash && "ring-1 ring-[#a78bfa]/60"
                    )}
                    style={{ backgroundColor: getCellColor(value, maxAbs) }}
                  >
                    {isNash && (
                      <motion.div
                        className="absolute inset-0 rounded-md border border-[#a78bfa]/40"
                        animate={{
                          opacity: [0.4, 1, 0.4],
                          borderColor: [
                            "rgba(167,139,250,0.2)",
                            "rgba(167,139,250,0.6)",
                            "rgba(167,139,250,0.2)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10",
                        value > 0 ? "text-state-buy" : value < 0 ? "text-state-avoid" : "text-fg-muted"
                      )}
                    >
                      {value > 0 ? "+" : ""}
                      {value.toFixed(1)}
                    </span>
                    {isNash && (
                      <span className="absolute top-0.5 right-1 text-[6px] font-mono text-[#a78bfa] font-bold">
                        NE
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[8px] font-mono text-fg-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-state-buy/40" /> Positive
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-state-avoid/40" /> Negative
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm border border-[#a78bfa]/50" /> Nash Equilibrium
        </span>
      </div>
    </div>
  );
}
