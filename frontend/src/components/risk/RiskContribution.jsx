import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ASSET_THEMES } from "../../lib/constants";

export default function RiskContribution({ riskContrib, activeAssets }) {
  if (!riskContrib) return null;

  const total = activeAssets.reduce((s, a) => s + (riskContrib[a] || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.38 }}
    >
      <Card className="overflow-hidden border border-terminal-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Risk Contribution</CardTitle>
          <p className="text-[10px] font-mono text-fg-muted uppercase tracking-widest mt-1">
            Portfolio risk decomposition by asset
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Stacked bar */}
          <div className="flex h-8 rounded-lg overflow-hidden bg-white/[0.03] border border-terminal-border/20 mb-4">
            {activeAssets.map((asset, i) => {
              const pct = total > 0 ? (riskContrib[asset] / total) * 100 : 25;
              const t = ASSET_THEMES[asset];
              return (
                <motion.div
                  key={asset}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                  className="h-full flex items-center justify-center relative group"
                  style={{ backgroundColor: t.color + "30" }}
                >
                  <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: t.color }}>
                    {pct > 12 ? `${pct.toFixed(0)}%` : ""}
                  </span>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ backgroundColor: t.color }}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {activeAssets.map((asset, i) => {
              const t = ASSET_THEMES[asset];
              const pct = total > 0 ? (riskContrib[asset] / total) * 100 : 25;
              return (
                <motion.div
                  key={asset}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + i * 0.06 }}
                  className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/[0.015] border border-terminal-border/15"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <div className="min-w-0">
                    <span className="text-[10px] font-sans text-fg-secondary block truncate">{t.label}</span>
                    <span className="font-mono text-xs font-bold tabular-nums" style={{ color: t.color }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
