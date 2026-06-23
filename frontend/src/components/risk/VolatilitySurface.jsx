import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ASSET_THEMES } from "../../lib/constants";

const WINDOWS = [5, 10, 20, 60];

function getVolColor(value) {
  if (value > 30) return "#ff0055";
  if (value > 22) return "#ff6b35";
  if (value > 15) return "#ffd600";
  if (value > 8) return "#00b0ff";
  return "#00f5a0";
}

function getVolBg(value) {
  if (value > 30) return "rgba(255,0,85,0.2)";
  if (value > 22) return "rgba(255,107,53,0.18)";
  if (value > 15) return "rgba(255,214,0,0.12)";
  if (value > 8) return "rgba(0,176,255,0.1)";
  return "rgba(0,245,160,0.1)";
}

export default function VolatilitySurface({ volSurface, activeAssets }) {
  if (!volSurface) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
    >
      <Card className="overflow-hidden border border-terminal-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Volatility Surface</CardTitle>
          <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest mt-1">
            Annualized vol across lookback windows
          </p>
        </CardHeader>
        <CardContent className="pt-2 overflow-x-auto">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="border-b border-terminal-border/30">
                <th className="text-left py-2 px-3 font-mono text-[10px] text-fg-muted uppercase tracking-wider font-medium w-[80px]">
                  Window
                </th>
                {activeAssets.map((asset) => {
                  const t = ASSET_THEMES[asset];
                  return (
                    <th key={asset} className="text-center py-2 px-3 font-mono text-[10px] uppercase tracking-wider font-medium" style={{ color: t.color }}>
                      {t.label.split(" ")[0]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {WINDOWS.map((window, wIdx) => (
                <motion.tr
                  key={window}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 + wIdx * 0.06 }}
                  className="border-b border-terminal-border/15"
                >
                  <td className="py-3 px-3 font-mono text-fg-secondary font-bold">{window}D</td>
                  {activeAssets.map((asset) => {
                    const val = volSurface[window]?.[asset] ?? 0;
                    const color = getVolColor(val);
                    const bg = getVolBg(val);
                    return (
                      <td key={asset} className="py-3 px-3 text-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.5 + wIdx * 0.06 }}
                          className="inline-flex items-center justify-center rounded px-3 py-1.5 min-w-[56px]"
                          style={{ backgroundColor: bg }}
                        >
                          <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>
                            {val.toFixed(1)}%
                          </span>
                        </motion.div>
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
