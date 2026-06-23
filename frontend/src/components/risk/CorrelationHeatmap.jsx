import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ASSET_THEMES, ASSETS } from "../../lib/constants";
import { AlertTriangle } from "lucide-react";

const ASSET_KEYS = [...ASSETS];

function getCorrelationColor(value) {
  if (value >= 0.7) return { bg: "rgba(255,0,85,0.25)", text: "#ff0055" };
  if (value >= 0.4) return { bg: "rgba(255,107,53,0.2)", text: "#ff6b35" };
  if (value >= 0.1) return { bg: "rgba(255,214,0,0.12)", text: "#ffd600" };
  if (value > -0.1) return { bg: "rgba(255,255,255,0.04)", text: "#94a3b8" };
  if (value > -0.4) return { bg: "rgba(0,176,255,0.12)", text: "#00b0ff" };
  return { bg: "rgba(0,242,254,0.18)", text: "#00f2fe" };
}

export default function CorrelationHeatmap({ correlation }) {
  if (!correlation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="overflow-hidden border border-terminal-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Asset Correlation Matrix</CardTitle>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-fg-muted">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: "rgba(0,242,254,0.18)" }} />
              <span>Negative</span>
              <div className="w-2 h-2 rounded-sm ml-1" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
              <span>Zero</span>
              <div className="w-2 h-2 rounded-sm ml-1" style={{ backgroundColor: "rgba(255,0,85,0.25)" }} />
              <span>Positive</span>
            </div>
          </div>
          <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest mt-1">
            60-day rolling correlation coefficients
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              {/* Header row */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `80px repeat(${ASSET_KEYS.length}, 1fr)` }}>
                <div />
                {ASSET_KEYS.map((asset) => {
                  const t = ASSET_THEMES[asset];
                  return (
                    <div key={asset} className="text-center py-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: t.color }}>
                        {t.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grid rows */}
              {ASSET_KEYS.map((rowAsset, rowIdx) => {
                const rowTheme = ASSET_THEMES[rowAsset];
                return (
                  <motion.div
                    key={rowAsset}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + rowIdx * 0.08 }}
                    className="grid gap-1 mb-1"
                    style={{ gridTemplateColumns: `80px repeat(${ASSET_KEYS.length}, 1fr)` }}
                  >
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: rowTheme.color }} />
                      <span className="text-[10px] font-mono font-bold text-fg-secondary truncate">{rowTheme.label.split(" ")[0]}</span>
                    </div>
                    {ASSET_KEYS.map((colAsset, colIdx) => {
                      const val = correlation[rowAsset]?.[colAsset] ?? 0;
                      const colors = getCorrelationColor(val);
                      const isHigh = rowAsset !== colAsset && Math.abs(val) > 0.7;

                      return (
                        <motion.div
                          key={colAsset}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.6 + rowIdx * 0.08 + colIdx * 0.04 }}
                          className="relative flex items-center justify-center rounded py-2 px-1 min-h-[40px]"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <span className="font-mono text-xs font-bold tabular-nums" style={{ color: colors.text }}>
                            {val.toFixed(2)}
                          </span>
                          {isHigh && (
                            <div className="absolute top-0.5 right-0.5">
                              <AlertTriangle size={8} className="text-state-avoid animate-pulse" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
