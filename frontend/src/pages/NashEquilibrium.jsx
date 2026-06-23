import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import EquilibriumGauge from "../components/nash/EquilibriumGauge";
import NetworkVisualization from "../components/nash/NetworkVisualization";
import PayoffMatrix from "../components/nash/PayoffMatrix";
import StrategyDistribution from "../components/nash/StrategyDistribution";
import EquilibriumHistory from "../components/nash/EquilibriumHistory";
import AssetNashCards from "../components/nash/AssetNashCards";
import {
  getGameTheoryLatest,
  getRegime,
  getNashEquilibria,
  getLatestScores,
} from "../services/api";

const REGIME_COLORS = {
  RISK_ON: "#00f5a0",
  RISK_OFF: "#ffd600",
  CRISIS: "#ff0055",
  TRANSITION: "#00b0ff",
};

export default function NashEquilibrium() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [regime, setRegime] = useState(null);
  const [nashData, setNashData] = useState(null);
  const [scores, setScores] = useState(null);
  const [history, setHistory] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [latestData, regimeData, nashHistory, latestScores] =
        await Promise.allSettled([
          getGameTheoryLatest(),
          getRegime(),
          getNashEquilibria(24),
          getLatestScores(),
        ]);

      let hasNashData = false;
      if (latestData.status === "fulfilled" && latestData.value) {
        setNashData(latestData.value);
        hasNashData = true;
      }
      let hasRegime = false;
      if (regimeData.status === "fulfilled" && regimeData.value) {
        setRegime(regimeData.value);
        hasRegime = true;
      }
      if (nashHistory.status === "fulfilled" && nashHistory.value?.length) {
        setHistory(nashHistory.value);
      }
      if (latestScores.status === "fulfilled" && latestScores.value) {
        setScores(latestScores.value);
      }

      if (!hasNashData && !hasRegime) {
        setError("Nash equilibrium data unavailable. The /game-theory/* endpoints are not implemented in the backend yet.");
      }
    } catch {
      setError("Failed to fetch equilibrium data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => fetchData(true);

  const equilibriumDistance = nashData?.nash?.length
    ? nashData.nash.reduce((sum, n) => sum + (1 - (n.probability || 0.5)), 0) /
      nashData.nash.length
    : null;

  const regimeLabel = regime?.regime_label || null;
  const regimeColor = regimeLabel ? (REGIME_COLORS[regimeLabel] || "#00f5a0") : null;
  const lambda = regime?.modulators?.vix ? (regime.modulators.vix / 10).toFixed(1) : null;

  const strategyDistribution = {};
  if (nashData?.strategies) {
    nashData.strategies.forEach((s) => {
      strategyDistribution[s.player] = s.distribution;
    });
  }

  const assetKeys = ["gold", "silver", "nifty", "real_estate"];
  const assetMeta = {
    gold: { label: "Gold Spot", ticker: "GC=F", color: "#e2b740" },
    silver: { label: "Silver Spot", ticker: "SI=F", color: "#94a3b8" },
    nifty: { label: "Nifty 50", ticker: "^NSEI", color: "#00f2fe" },
    real_estate: { label: "Nifty Realty", ticker: "^CNXREALTY", color: "#00f5a0" },
  };
  const assetNashData = scores && nashData ? assetKeys.map((k) => ({
    key: k,
    ...assetMeta[k],
    nashDistance: scores[k]?.nash_distance ?? 0,
    signalContribution: scores[k]?.nash_contribution ?? 0,
    sparkline: null,
  })) : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4 text-fg-secondary">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-terminal-border/20 border-t-[#a78bfa] animate-spin" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
          computing nash equilibria...
        </p>
      </div>
    );
  }

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 lg:space-y-5"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display font-black text-xl tracking-tight text-fg-primary flex items-center gap-2">
            <Zap size={20} className="text-[#a78bfa]" />
            Nash Equilibrium Engine
          </h2>
          <p className="text-[11px] text-fg-secondary mt-0.5">
            Strategic game visualization — 3-player market equilibrium analysis
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
            {refreshing ? "SYNCING..." : "SYNC EQUILIBRIA"}
          </Button>
        </div>
      </motion.div>

      {/* Top Row: Gauge + Regime + Lambda */}
      {equilibriumDistance !== null && regimeLabel && lambda && (
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-terminal-border/40 bg-terminal-card backdrop-blur-md p-6 flex flex-col md:flex-row items-center justify-center gap-8"
        >
          <EquilibriumGauge
            distance={equilibriumDistance}
            lambda={parseFloat(lambda)}
            regimeLabel={regimeLabel}
            regimeColor={regimeColor}
          />
        </motion.div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column: Network Visualization (60%) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 rounded-xl border border-terminal-border/40 bg-terminal-card backdrop-blur-md p-4 overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-xs font-bold text-fg-primary tracking-wide uppercase">
              Strategic Network
            </h3>
            <span className="font-mono text-[8px] text-fg-muted tracking-widest uppercase">
              3-Player Game Graph
            </span>
          </div>
          <div className="h-[320px] lg:h-[380px]">
            {nashData?.nash?.length ? (
              <NetworkVisualization
                players={nashData.nash.map((n) => ({
                  id: n.player || n.asset,
                  label: n.player === "retail" ? "Retail Traders" : n.player === "institutional" ? "Institutional" : "Government / CB",
                  color: n.player === "retail" ? "#00f2fe" : n.player === "institutional" ? "#e2b740" : "#a78bfa",
                  glowRgb: n.player === "retail" ? "0, 242, 254" : n.player === "institutional" ? "226, 183, 64" : "167, 139, 250",
                  strategy: n.strategy || "Hold",
                  payoff: n.payoff || 0,
                  position: n.player === "retail" ? { x: 120, y: 200 } : n.player === "institutional" ? { x: 420, y: 200 } : { x: 270, y: 60 },
                }))}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-fg-muted font-mono text-xs">
                No network data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column: Data Panels (40%) */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-terminal-border/40 bg-terminal-card backdrop-blur-md p-4"
          >
            <PayoffMatrix />
          </motion.div>

          {Object.keys(strategyDistribution).length > 0 && (
            <motion.div
              variants={itemVariants}
              className="rounded-xl border border-terminal-border/40 bg-terminal-card backdrop-blur-md p-4"
            >
              <StrategyDistribution data={strategyDistribution} />
            </motion.div>
          )}

          {history && history.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="rounded-xl border border-terminal-border/40 bg-terminal-card backdrop-blur-md p-4"
            >
              <EquilibriumHistory history={history} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Row: Asset Nash Cards */}
      {assetNashData.length > 0 && (
        <motion.div variants={itemVariants}>
          <AssetNashCards assets={assetNashData} />
        </motion.div>
      )}
    </motion.div>
  );
}
