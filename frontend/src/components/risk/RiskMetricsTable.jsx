import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ASSET_THEMES } from "../../lib/constants";

const METRIC_ROWS = [
  { key: "var95", label: "VaR (95%)", format: (v) => `${v.toFixed(2)}%` },
  { key: "var99", label: "VaR (99%)", format: (v) => `${v.toFixed(2)}%` },
  { key: "cvar", label: "CVaR (95%)", format: (v) => `${v.toFixed(2)}%` },
  { key: "sharpe", label: "Sharpe Ratio", format: (v) => v.toFixed(2) },
  { key: "sortino", label: "Sortino Ratio", format: (v) => v.toFixed(2) },
  { key: "maxDrawdown", label: "Max Drawdown", format: (v) => `${v.toFixed(2)}%` },
  { key: "currentDrawdown", label: "Current Drawdown", format: (v) => `${v.toFixed(2)}%` },
  { key: "vol30", label: "30D Volatility", format: (v) => `${v.toFixed(2)}%` },
  { key: "vol60", label: "60D Volatility", format: (v) => `${v.toFixed(2)}%` },
  { key: "beta", label: "Beta (vs Nifty)", format: (v) => v.toFixed(2) },
];

function getColorForMetric(key, value) {
  switch (key) {
    case "var95":
    case "var99":
    case "cvar":
    case "maxDrawdown":
    case "currentDrawdown":
      if (value < -5) return "#ff0055";
      if (value < -2) return "#ff6b35";
      if (value < 0) return "#ffd600";
      return "#00f5a0";
    case "sharpe":
    case "sortino":
      if (value > 1.5) return "#00f5a0";
      if (value > 0.5) return "#ffd600";
      if (value > 0) return "#ff6b35";
      return "#ff0055";
    case "vol30":
    case "vol60":
      if (value > 25) return "#ff0055";
      if (value > 15) return "#ff6b35";
      if (value > 10) return "#ffd600";
      return "#00f5a0";
    case "beta":
      if (value > 1.5) return "#ff6b35";
      if (value > 0.8 && value < 1.2) return "#00f5a0";
      return "#ffd600";
    default:
      return "#94a3b8";
  }
}

export default function RiskMetricsTable({ metrics, activeAssets }) {
  if (!metrics) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="overflow-hidden border border-terminal-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detailed Risk Metrics</CardTitle>
          <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest mt-1">
            Per-asset risk decomposition
          </p>
        </CardHeader>
        <CardContent className="pt-2 overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-terminal-border/30">
                <th className="text-left py-2 px-3 font-mono text-[10px] text-fg-muted uppercase tracking-wider font-medium w-[130px]">
                  Metric
                </th>
                {activeAssets.map((asset) => {
                  const t = ASSET_THEMES[asset];
                  return (
                    <th key={asset} className="text-right py-2 px-3 font-mono text-[10px] uppercase tracking-wider font-medium" style={{ color: t.color }}>
                      {t.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row, idx) => (
                <motion.tr
                  key={row.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + idx * 0.03 }}
                  className="border-b border-terminal-border/15 hover:bg-white/[0.015] transition-colors"
                >
                  <td className="py-2.5 px-3 font-sans text-fg-secondary whitespace-nowrap">{row.label}</td>
                  {activeAssets.map((asset) => {
                    const val = metrics[asset]?.[row.key] ?? 0;
                    const color = getColorForMetric(row.key, val);
                    return (
                      <td key={asset} className="text-right py-2.5 px-3">
                        <span className="font-mono font-bold tabular-nums" style={{ color }}>
                          {row.format(val)}
                        </span>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
