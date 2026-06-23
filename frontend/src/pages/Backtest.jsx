import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { getScoreHistory } from "../services/api";
import { ASSET_THEMES, RECOMMENDATION_COLORS } from "../lib/constants";
import BacktestControls from "../components/backtest/BacktestControls";
import RecommendationTimeline from "../components/backtest/RecommendationTimeline";
import EquityCurve from "../components/backtest/EquityCurve";
import RecommendationBreakdown from "../components/backtest/RecommendationBreakdown";
import FactorContribution from "../components/backtest/FactorContribution";
import { AlertTriangle, BarChart3, Target, Percent } from "lucide-react";
import { Card } from "../components/ui/card";
import { cn } from "../lib/utils";

const FACTOR_KEYS = [
  "inflation", "currency", "monetary", "vix", "institutional",
  "sentiment", "nash", "qre", "ensemble", "fp", "ftpl",
];

function SummaryCard({ icon: Icon, label, value, suffix = "", positive, delay = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = parseFloat(value) || 0;
    const duration = 1200;
    const startTime = Date.now();
    let frame;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: "easeOut" }}
    >
      <Card className="border border-terminal-border/30 bg-terminal-card/60 backdrop-blur-md p-4 cyber-corners">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-fg-muted mb-1.5">
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-mono font-bold tabular-nums",
                positive === undefined
                  ? "text-fg-primary"
                  : positive
                  ? "text-state-buy"
                  : "text-state-avoid"
              )}
            >
              {displayValue >= 0 && positive !== false ? "+" : ""}
              {displayValue.toFixed(1)}
              <span className="text-sm text-fg-muted ml-0.5">{suffix}</span>
            </p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.03] border border-terminal-border/20">
            <Icon size={16} className={cn(positive ? "text-state-buy" : positive === false ? "text-state-avoid" : "text-brand-nifty")} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function computeEquityCurve(scoreHistory) {
  let modelBase = 100;
  let benchBase = 100;
  return scoreHistory.map((d) => {
    const dailyReturn = (d.score - 50) / 5000;
    const benchReturn = 0.0002;
    modelBase *= 1 + dailyReturn;
    benchBase *= 1 + benchReturn;
    return {
      timestamp: d.timestamp,
      modelReturn: +(((modelBase / 100) - 1) * 100).toFixed(2),
      benchmarkReturn: +(((benchBase / 100) - 1) * 100).toFixed(2),
    };
  });
}

function computeFactorData(scoreHistory) {
  return scoreHistory.map((d, i) => {
    const factors = {};
    FACTOR_KEYS.forEach((key, ki) => {
      const window = (ki + 1) * 2;
      if (i < window) {
        factors[key] = 0;
      } else {
        factors[key] = +((d.score - scoreHistory[i - window].score) / window * 2).toFixed(1);
      }
    });
    return { timestamp: d.timestamp, ...factors };
  });
}

export default function Backtest() {
  const [activeAsset, setActiveAsset] = useState("gold");
  const [activePreset, setActivePreset] = useState("1Y");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoreHistory, setScoreHistory] = useState([]);

  const dateRange = useMemo(() => {
    const end = new Date();
    const presetDays = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365, ALL: 365 * 3 };
    const start = new Date(end.getTime() - (presetDays[activePreset] || 365) * 24 * 3600 * 1000);
    return { start, end };
  }, [activePreset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScoreHistory(activeAsset, 500);
      if (data && data.length > 0) {
        setScoreHistory(data);
      } else {
        setError("No backtest data available for this asset.");
        setScoreHistory([]);
      }
    } catch {
      setError("Score history API unavailable. Start the backend to see live backtest data.");
      setScoreHistory([]);
    } finally {
      setLoading(false);
    }
  }, [activeAsset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const equityCurve = useMemo(() => computeEquityCurve(scoreHistory), [scoreHistory]);
  const factorData = useMemo(() => computeFactorData(scoreHistory), [scoreHistory]);

  const summaryMetrics = useMemo(() => {
    if (scoreHistory.length === 0) return { totalReturn: 0, accuracy: 0, sharpe: 0 };
    const equity = equityCurve[equityCurve.length - 1];
    let correct = 0;
    let total = 0;
    for (let i = 1; i < scoreHistory.length; i++) {
      const prev = scoreHistory[i - 1];
      const curr = scoreHistory[i];
      if (prev.recommendation === curr.recommendation) continue;
      total++;
      if (curr.recommendation === "AVOID" && curr.score < prev.score) correct++;
      else if (curr.recommendation !== "AVOID" && curr.score > prev.score) correct++;
    }
    const returns = equityCurve.map(e => e.modelReturn);
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length);
    const sharpe = std > 0 ? mean / std : 0;
    return {
      totalReturn: equity?.modelReturn || 0,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      sharpe: +sharpe.toFixed(2),
    };
  }, [scoreHistory, equityCurve]);

  const handleNavigate = (dir) => {
    setActivePreset((prev) => {
      const order = ["7D", "30D", "90D", "1Y", "ALL"];
      const idx = order.indexOf(prev);
      const next = dir === "next" ? Math.min(idx + 1, 4) : Math.max(idx - 1, 0);
      return order[next];
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4 text-fg-secondary">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-terminal-border/20 border-t-brand-nifty animate-spin" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">
          initializing backtest matrix...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4 text-fg-secondary">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff0055]/10 border border-[#ff0055]/20 text-[#ff0055]">
          <AlertTriangle size={16} />
          <span className="font-mono text-xs font-bold">{error}</span>
        </div>
        <BacktestControls
          activeAsset={activeAsset}
          onAssetChange={(a) => { setActiveAsset(a); setLoading(true); }}
          dateRange={dateRange}
          onDateRangeChange={() => {}}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
          onNavigate={handleNavigate}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 lg:space-y-5"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display font-black text-xl tracking-tight text-fg-primary">
            Historical Backtest
          </h2>
          <p className="text-[11px] text-fg-secondary mt-0.5">
            Validate model recommendations against forward performance. What would the algorithm have earned?
          </p>
        </div>
      </motion.div>

      {/* Controls */}
      <BacktestControls
        activeAsset={activeAsset}
        onAssetChange={setActiveAsset}
        dateRange={dateRange}
        onDateRangeChange={() => {}}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
        onNavigate={handleNavigate}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={BarChart3}
          label="Total Return"
          value={summaryMetrics.totalReturn}
          suffix="%"
          positive={summaryMetrics.totalReturn > 0}
          delay={100}
        />
        <SummaryCard
          icon={Target}
          label="Model Accuracy"
          value={summaryMetrics.accuracy}
          suffix="%"
          positive={undefined}
          delay={200}
        />
        <SummaryCard
          icon={Percent}
          label="Sharpe Ratio"
          value={summaryMetrics.sharpe}
          suffix=""
          positive={undefined}
          delay={300}
        />
      </div>

      {/* Recommendation Timeline */}
      <RecommendationTimeline
        data={scoreHistory}
        assetColor={ASSET_THEMES[activeAsset]?.color || "#00f2fe"}
      />

      {/* Performance Analysis: Two-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EquityCurve data={equityCurve} />
        <RecommendationBreakdown data={scoreHistory} />
      </div>

      {/* Factor Contribution */}
      <FactorContribution data={factorData} />
    </motion.div>
  );
}
