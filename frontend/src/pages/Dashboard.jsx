import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getLatestScores, getScoreHistory, getLatestMarketData, getLatestNews } from "../services/api";
import AssetCard from "../components/dashboard/AssetCard";
import ScoreHistoryChart from "../components/dashboard/ScoreHistoryChart";
import MacroIndicatorCard from "../components/dashboard/MacroIndicatorCard";
import AllocationVisualizer from "../components/dashboard/AllocationVisualizer";
import StatsOverview from "../components/dashboard/StatsOverview";
import NewsFeed from "../components/dashboard/NewsFeed";
import { RefreshCw, LayoutGrid, Layers, Info } from "lucide-react";
import { Button } from "../components/ui/button";

// Mock Fallbacks for robust offline display
const MOCK_SCORES = {
  gold: { score: 78, recommendation: "STRONG BUY", details: { base_score: 50, inflation: 12, usd_inr: 10, fear_index: 6 } },
  silver: { score: 66, recommendation: "ACCUMULATE", details: { base_score: 50, inflation: 10, usd_inr: 10, crowd_hype: -4 } },
  nifty: { score: 58, recommendation: "HOLD", details: { base_score: 50, institutional_buying: 15, crowd_hype: -15, usd_inr: 8 } },
  real_estate: { score: 42, recommendation: "AVOID", details: { base_score: 50, inflation: 4, crowd_hype: -20, usd_inr: 8 } },
};

const MOCK_MARKET_DATA = {
  repo_rate: { value: 6.50 },
  inflation: { value: 5.10 },
  india_vix: { price: 15.65 },
  usd_inr: { price: 83.42 },
  gold: { price: 2322.80, currency: "USD" },
  silver: { price: 29.45, currency: "USD" },
  nifty: { price: 22828.15, currency: "INR" },
  real_estate: { price: 955.00, currency: "INR" },
};

const MOCK_NEWS = [
  { asset: "gold", headline: "Central banks accelerate global reserves accumulation program as currency hedges", sentiment: 0.82, timestamp: new Date(Date.now() - 4 * 60000).toISOString() },
  { asset: "nifty", headline: "Institutional buying peaks; indices signal overheated retail momentum warnings", sentiment: -0.12, timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
  { asset: "silver", headline: "Photovoltaic cells industrial consumption pushes physical silver warehouse stockpiles down", sentiment: 0.68, timestamp: new Date(Date.now() - 110 * 60000).toISOString() },
  { asset: "real_estate", headline: "Commercial realty absorption slows as hybrid leases trigger vacancy increases", sentiment: -0.52, timestamp: new Date(Date.now() - 240 * 60000).toISOString() },
];

const generateMockHistory = (asset) => {
  const base = asset === "gold" ? 70 : asset === "silver" ? 60 : asset === "nifty" ? 54 : 42;
  const history = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 3600 * 1000).toISOString();
    const score = Math.min(100, Math.max(0, base + Math.sin(i / 3) * 12 + (i % 2 === 0 ? 4 : -4)));
    const rec = score >= 70 ? "STRONG BUY" : score >= 50 ? "ACCUMULATE" : score >= 30 ? "HOLD" : "AVOID";
    history.push({ timestamp, score, recommendation: rec });
  }
  return history;
};

const ASSET_THEMES = {
  gold: { color: "#e2b740", label: "Gold Spot" },
  silver: { color: "#94a3b8", label: "Silver Spot" },
  nifty: { color: "#00f2fe", label: "Nifty 50" },
  real_estate: { color: "#00f5a0", label: "Nifty Realty" },
};

export default function Dashboard() {
  const [scores, setScores] = useState({});
  const [marketData, setMarketData] = useState({});
  const [news, setNews] = useState([]);
  const [activeAsset, setActiveAsset] = useState("gold");
  const [history, setHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    
    try {
      // Attempt API queries
      const latestScores = await getLatestScores();
      const latestMarket = await getLatestMarketData();
      const latestNews = await getLatestNews(10);
      
      setScores(latestScores || MOCK_SCORES);
      setMarketData(latestMarket || MOCK_MARKET_DATA);
      setNews(latestNews || MOCK_NEWS);
      setIsDemoMode(false);
    } catch (err) {
      console.warn("Backend API offline, launching in premium standalone sandbox mode:", err);
      // Failover to stand-alone sandbox mocks
      setScores(MOCK_SCORES);
      setMarketData(MOCK_MARKET_DATA);
      setNews(MOCK_NEWS);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchActiveHistory = useCallback(async () => {
    if (isDemoMode) {
      setHistory(generateMockHistory(activeAsset));
      return;
    }
    try {
      const activeHistory = await getScoreHistory(activeAsset, 30);
      if (activeHistory && activeHistory.length > 0) {
        setHistory(activeHistory);
      } else {
        setHistory(generateMockHistory(activeAsset));
      }
    } catch (err) {
      console.error(`Error loading score history for ${activeAsset}:`, err);
      setHistory(generateMockHistory(activeAsset));
    }
  }, [activeAsset, isDemoMode]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reload history when active asset changes or scores update
  useEffect(() => {
    if (Object.keys(scores).length > 0) {
      fetchActiveHistory();
    }
  }, [activeAsset, scores, fetchActiveHistory]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Calculates optimal portfolio weights based on scoring offsets
  const calculateAllocations = () => {
    const assets = ["gold", "silver", "nifty", "real_estate"];
    let totalAdjusted = 0;
    
    const adjustedScores = assets.reduce((acc, curr) => {
      const score = scores[curr]?.score || 50;
      // Subtract AVOID threshold (30). If score < 30, weight is 0.
      const adjusted = Math.max(0, score - 30);
      acc[curr] = adjusted;
      totalAdjusted += adjusted;
      return acc;
    }, {});

    if (totalAdjusted === 0) {
      return assets.reduce((acc, curr) => {
        acc[curr] = 25;
        return acc;
      }, {});
    }

    return assets.reduce((acc, curr) => {
      acc[curr] = Math.round((adjustedScores[curr] / totalAdjusted) * 100);
      return acc;
    }, {});
  };

  const allocations = calculateAllocations();
  const currentAssetTheme = ASSET_THEMES[activeAsset] || { color: "#fff", label: activeAsset };

  // Fetch macro indicators with defaults
  const repoRate = marketData.repo_rate?.value || 6.50;
  const inflation = marketData.inflation?.value || 5.10;
  const vix = marketData.india_vix?.price || 15.65;
  const usdInr = marketData.usd_inr?.price || 83.42;

  // Animation constants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4 text-fg-secondary">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-terminal-border/20 border-t-brand-nifty animate-spin"></div>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
          booting matrix engines...
        </p>
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
      {/* Title & Top Action bar */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl tracking-tight text-fg-primary">
            Game-Theory Decision Shell
          </h2>
          <p className="text-[11px] text-fg-secondary mt-0.5">
            Real-time quantitative asset scoring matrices for strategic capital deploy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDemoMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-mono font-bold tracking-wider uppercase">
              <Info size={11} />
              SANDBOX SIM MODE
            </div>
          )}

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

      {/* Stats row overview */}
      <motion.div variants={itemVariants}>
        <StatsOverview scores={scores} marketData={marketData} allocations={allocations} />
      </motion.div>

      {/* Macro Indicators Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MacroIndicatorCard
          type="inflation"
          title="Inflation (CPI)"
          value={`${inflation.toFixed(2)}%`}
          description="MoSPI Core Baseline"
        />
        <MacroIndicatorCard
          type="repo"
          title="RBI Repo Rate"
          value={`${repoRate.toFixed(2)}%`}
          description="Monetary Corridor"
        />
        <MacroIndicatorCard
          type="vix"
          title="India VIX"
          value={vix.toFixed(2)}
          description="Fear & Volatility Index"
        />
        <MacroIndicatorCard
          type="currency"
          title="USD / INR"
          value={`₹${usdInr.toFixed(2)}`}
          description="Foreign Exchange Spot"
        />
      </motion.div>

      {/* Main Grid: Assets list + Charts & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left columns (Assets list + scoring history area) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Asset scoring cards grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {Object.keys(ASSET_THEMES).map((assetKey) => {
              const scoreObj = scores[assetKey] || {};
              const marketPriceObj = marketData[assetKey] || {};
              return (
                <AssetCard
                  key={assetKey}
                  asset={assetKey}
                  score={scoreObj.score}
                  recommendation={scoreObj.recommendation}
                  details={scoreObj.details}
                  price={marketPriceObj.price}
                  currency={marketPriceObj.currency}
                  isActive={activeAsset === assetKey}
                  onClick={() => setActiveAsset(assetKey)}
                />
              );
            })}
          </motion.div>

          {/* Allocation stacked visualizer */}
          <motion.div variants={itemVariants}>
            <AllocationVisualizer allocations={allocations} />
          </motion.div>

          {/* Chart timeline metrics */}
          <motion.div variants={itemVariants} className="h-[320px]">
            <ScoreHistoryChart data={history} color={currentAssetTheme.color} />
          </motion.div>
        </div>

        {/* Right column: live news feeds */}
        <motion.div variants={itemVariants} className="h-full min-h-[450px] lg:h-[640px]">
          <NewsFeed news={news} loading={loading} />
        </motion.div>
      </div>
    </motion.div>
  );
}
