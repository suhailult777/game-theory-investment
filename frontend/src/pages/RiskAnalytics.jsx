import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getScoreHistory } from "../services/api";
import { ASSETS, ASSET_THEMES } from "../lib/constants";
import { cn } from "../lib/utils";
import { ASSET_KEYS, computeAllRiskMetrics } from "../components/risk/riskUtils";
import RiskScoreCard from "../components/risk/RiskScoreCard";
import UnderwaterChart from "../components/risk/UnderwaterChart";
import VolatilitySurface from "../components/risk/VolatilitySurface";
import RiskMetricsTable from "../components/risk/RiskMetricsTable";
import CorrelationHeatmap from "../components/risk/CorrelationHeatmap";
import RiskContribution from "../components/risk/RiskContribution";
import RiskAlertsPanel from "../components/risk/RiskAlertsPanel";
import { RefreshCw, AlertCircle, Activity, Layers } from "lucide-react";
import { Button } from "../components/ui/button";

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4 text-fg-secondary">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-[3px] border-terminal-border/20 border-t-brand-nifty animate-spin" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
        computing risk matrices...
      </p>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function RiskAnalytics() {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeAssets, setActiveAssets] = useState([...ASSET_KEYS]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const histories = {};
      await Promise.all(
        ASSET_KEYS.map(async (asset) => {
          const data = await getScoreHistory(asset, 120);
          histories[asset] = data?.map((d) => ({
            timestamp: d.timestamp,
            price: 100 + d.score * (asset === "gold" ? 20 : asset === "silver" ? 3 : asset === "nifty" ? 200 : 10),
          })) || [];
        })
      );

      const hasData = ASSET_KEYS.every((a) => histories[a]?.length > 5);
      if (!hasData) throw new Error("Insufficient data");

      const computed = computeAllRiskMetrics(histories);
      setRiskData({ histories, ...computed });
    } catch {
      setError("Risk data unavailable. Score history API returned insufficient data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => fetchData(true);

  const toggleAsset = (asset) => {
    setActiveAssets((prev) => {
      if (prev.includes(asset)) {
        if (prev.length <= 1) return prev;
        return prev.filter((a) => a !== asset);
      }
      return [...prev, asset];
    });
  };

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4 text-fg-secondary">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff0055]/10 border border-[#ff0055]/20 text-[#ff0055]">
          <AlertCircle size={16} />
          <span className="font-mono text-xs font-bold">{error}</span>
        </div>
        <Button variant="quantum" onClick={handleRefresh} className="font-mono text-xs font-bold tracking-wider uppercase">
          <RefreshCw size={13} />
          RETRY
        </Button>
      </div>
    );
  }
  if (!riskData) return <LoadingState />;

  const { metrics, correlation, volSurface, riskContrib, sparklines } = riskData;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 lg:space-y-5"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display font-black text-xl tracking-tight text-fg-primary">
              Risk Analytics
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-brand-nifty/10 border border-brand-nifty/20 text-brand-nifty text-[10px] font-mono font-bold tracking-wider uppercase">
              <Activity size={11} />
              VaR & Correlation Engine
            </div>
          </div>
          <p className="text-[11px] text-fg-secondary mt-0.5">
            Institutional-grade risk decomposition and portfolio stress metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="quantum"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-xs font-bold tracking-wider uppercase"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "SYNCING..." : "SYNC MATRIX"}
          </Button>
        </div>
      </motion.div>

      {/* Asset filter toggles */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
        <Layers size={12} className="text-fg-muted" />
        <span className="text-[10px] font-mono text-fg-muted uppercase tracking-wider mr-1">Assets:</span>
        {ASSET_KEYS.map((asset) => {
          const t = ASSET_THEMES[asset];
          const active = activeAssets.includes(asset);
          return (
            <button
              key={asset}
              onClick={() => toggleAsset(asset)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition-all duration-200",
                active
                  ? "border-transparent"
                  : "border-terminal-border/20 bg-transparent text-fg-muted hover:border-terminal-border-hover/40"
              )}
              style={
                active
                  ? {
                      backgroundColor: t.color + "15",
                      borderColor: t.color + "40",
                      color: t.color,
                      boxShadow: `0 0 12px ${t.color}15`,
                    }
                  : undefined
              }
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? t.color : "#475569" }} />
              {t.label}
            </button>
          );
        })}
      </motion.div>

      {/* Risk Score Cards (4 cards) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ASSET_KEYS.map((asset, idx) => (
          <RiskScoreCard
            key={asset}
            asset={asset}
            metrics={metrics[asset]}
            sparklineData={sparklines[asset]}
            index={idx}
          />
        ))}
      </motion.div>

      {/* Main Content: Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column (55%) */}
        <div className="lg:col-span-3 space-y-4">
          <UnderwaterChart metrics={metrics} activeAssets={activeAssets} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VolatilitySurface volSurface={volSurface} activeAssets={activeAssets} />
            <RiskContribution riskContrib={riskContrib} activeAssets={activeAssets} />
          </div>
        </div>

        {/* Right Column (45%) */}
        <div className="lg:col-span-2 space-y-4">
          <RiskMetricsTable metrics={metrics} activeAssets={activeAssets} />
          <CorrelationHeatmap correlation={correlation} />
          <RiskAlertsPanel metrics={metrics} correlation={correlation} />
        </div>
      </div>
    </motion.div>
  );
}
