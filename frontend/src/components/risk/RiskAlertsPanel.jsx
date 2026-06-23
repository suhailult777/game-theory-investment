import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ASSET_THEMES, ASSETS } from "../../lib/constants";
import { AlertTriangle, Flame, TrendingDown, ShieldCheck } from "lucide-react";

const ASSET_KEYS = [...ASSETS];

export default function RiskAlertsPanel({ metrics, correlation }) {
  if (!metrics) return null;

  const highRiskAssets = ASSET_KEYS.filter(
    (a) => metrics[a]?.riskLevel === "HIGH" || metrics[a]?.riskLevel === "EXTREME"
  );

  const worstVaR = ASSET_KEYS.reduce(
    (worst, a) => (metrics[a]?.var95 < worst.value ? { asset: a, value: metrics[a].var95 } : worst),
    { asset: "gold", value: 0 }
  );

  // Diversification ratio: weighted avg vol / portfolio vol
  const vols = ASSET_KEYS.map((a) => metrics[a]?.vol30 || 0);
  const n = vols.length || 1;
  const avgVol = vols.reduce((s, v) => s + v, 0) / n;
  // Portfolio vol with equal weights: sqrt(w' * Cov * w)
  // Simplified: portfolioVol = sqrt( sum(wi^2*si^2) + 2*sum(wi*wj*si*sj*corr(i,j)) )
  const w = 1 / n;
  let portfolioVar = 0;
  for (let i = 0; i < n; i++) {
    portfolioVar += w * w * vols[i] * vols[i];
    for (let j = i + 1; j < n; j++) {
      const corr = correlation?.[ASSET_KEYS[i]]?.[ASSET_KEYS[j]] || 0;
      portfolioVar += 2 * w * w * vols[i] * vols[j] * corr;
    }
  }
  const portfolioVol = Math.sqrt(Math.max(portfolioVar, 0));
  const divRatio = portfolioVol > 0 ? (avgVol / portfolioVol).toFixed(2) : "1.00";

  // Concentration index: HHI of risk contributions
  const totalRisk = ASSET_KEYS.reduce((s, a) => s + (metrics[a]?.vol30 || 0), 0);
  const hhi = totalRisk > 0
    ? ASSET_KEYS.reduce((s, a) => {
        const w = (metrics[a]?.vol30 || 0) / totalRisk;
        return s + w * w;
    }, 0)
    : 0.25;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
    >
      <Card className="overflow-hidden border border-terminal-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Risk Alerts Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          {/* High risk count */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-terminal-border/20">
            <div className="flex items-center gap-2">
              {highRiskAssets.length > 0 ? (
                <Flame size={14} className="text-state-avoid" />
              ) : (
                <ShieldCheck size={14} className="text-state-buy" />
              )}
              <span className="text-xs font-sans text-fg-secondary">High/Extreme Risk Assets</span>
            </div>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: highRiskAssets.length > 0 ? "#ff0055" : "#00f5a0" }}
            >
              {highRiskAssets.length}
            </span>
          </div>

          {/* Worst VaR */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-terminal-border/20">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-state-avoid" />
              <span className="text-xs font-sans text-fg-secondary">Worst VaR (95%)</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-state-avoid">
                {worstVaR.value.toFixed(2)}%
              </span>
              <span className="text-[10px] font-mono text-fg-muted block">{ASSET_THEMES[worstVaR.asset]?.label}</span>
            </div>
          </div>

          {/* Diversification Ratio */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-terminal-border/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-state-hold" />
              <span className="text-xs font-sans text-fg-secondary">Diversification Ratio</span>
            </div>
            <span className="font-mono text-sm font-bold tabular-nums" style={{ color: parseFloat(divRatio) > 1.2 ? "#00f5a0" : "#ff6b35" }}>
              {divRatio}
            </span>
          </div>

          {/* Concentration Index */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-terminal-border/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-state-hold" />
              <span className="text-xs font-sans text-fg-secondary">Concentration Index</span>
            </div>
            <span className="font-mono text-sm font-bold tabular-nums" style={{ color: hhi > 0.35 ? "#ff6b35" : "#00f5a0" }}>
              {(hhi * 100).toFixed(1)}
            </span>
          </div>

          {/* Correlated pairs warning */}
          {correlation && (() => {
            const warnings = [];
            ASSET_KEYS.forEach((a, i) => {
              ASSET_KEYS.forEach((b, j) => {
                if (i < j && Math.abs(correlation[a]?.[b] || 0) > 0.7) {
                  warnings.push({ a, b, val: correlation[a][b] });
                }
              });
            });
            if (warnings.length === 0) return null;
            return (
              <div className="py-2 px-3 rounded-lg bg-state-avoid/5 border border-state-avoid/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} className="text-state-avoid" />
                  <span className="text-[10px] font-mono font-bold text-state-avoid uppercase tracking-wider">
                    High Correlation Alert
                  </span>
                </div>
                {warnings.map((w) => (
                  <div key={`${w.a}-${w.b}`} className="flex items-center justify-between text-[10px] py-0.5">
                    <span className="font-sans text-fg-secondary">
                      {ASSET_THEMES[w.a]?.label.split(" ")[0]} / {ASSET_THEMES[w.b]?.label.split(" ")[0]}
                    </span>
                    <span className="font-mono font-bold text-state-avoid">{w.val.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </motion.div>
  );
}
