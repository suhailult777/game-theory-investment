import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { ASSET_THEMES } from "../../lib/constants";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Send,
  X,
} from "lucide-react";

const ASSETS = [
  { value: "all", label: "All Assets" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "nifty", label: "Nifty 50" },
  { value: "real_estate", label: "Real Estate" },
];

const METRICS = [
  { value: "score", label: "Composite Score" },
  { value: "price", label: "Market Price" },
  { value: "vix", label: "India VIX" },
  { value: "inflation", label: "CPI Inflation" },
  { value: "fii_flow", label: "FII Flow" },
  { value: "sentiment", label: "Sentiment" },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function CreateAlertRule({ onSubmit, onCancel, editingRule }) {
  const [asset, setAsset] = useState(editingRule?.asset || "gold");
  const [metric, setMetric] = useState(editingRule?.metric || "score");
  const [condition, setCondition] = useState(editingRule?.condition || "above");
  const [threshold, setThreshold] = useState(editingRule?.threshold || 70);
  const [channels, setChannels] = useState(editingRule?.channels || ["telegram"]);
  const [name, setName] = useState(editingRule?.name || "");
  const [expanded, setExpanded] = useState(!!editingRule);

  const toggleChannel = (ch) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      const assetLabel =
        asset === "all" ? "All" : ASSET_THEMES[asset]?.label || asset;
      const metricLabel =
        METRICS.find((m) => m.value === metric)?.label || metric;
      const autoName = `${assetLabel} ${metricLabel} ${condition} ${threshold}`;
      setName(autoName);
    }
    onSubmit({
      id: editingRule?.id || generateId(),
      asset,
      metric,
      condition,
      threshold,
      channels,
      name: name.trim() || `${asset} ${metric} ${condition} ${threshold}`,
      enabled: editingRule?.enabled ?? true,
      created_at: editingRule?.created_at || new Date().toISOString(),
      last_triggered: editingRule?.last_triggered || null,
    });
    if (!editingRule) {
      setAsset("gold");
      setMetric("score");
      setCondition("above");
      setThreshold(70);
      setChannels(["telegram"]);
      setName("");
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Collapsed trigger */}
      {!expanded && !editingRule && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-terminal-border/40 hover:border-brand-nifty/30 text-fg-muted hover:text-brand-nifty text-xs font-mono transition-colors bg-terminal-card/50 hover:bg-brand-nifty/5"
        >
          <Plus size={14} />
          CREATE NEW ALERT RULE
        </button>
      )}

      {/* Expanded form */}
      {(expanded || editingRule) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-terminal-border/40 bg-terminal-card p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-fg-secondary uppercase tracking-wider">
              {editingRule ? "Edit Alert Rule" : "New Alert Rule"}
            </h4>
            {!editingRule && (
              <button
                type="button"
                onClick={() => { setExpanded(false); onCancel?.(); }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 text-fg-muted"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Asset */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider">
                Asset
              </label>
              <div className="relative">
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full appearance-none bg-terminal-bg border border-terminal-border/60 rounded-md px-3 py-2 text-xs font-mono text-fg-primary focus:outline-none focus:border-brand-nifty/40 transition-colors cursor-pointer"
                >
                  {ASSETS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-fg-muted">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Metric */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider">
                Metric
              </label>
              <div className="relative">
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full appearance-none bg-terminal-bg border border-terminal-border/60 rounded-md px-3 py-2 text-xs font-mono text-fg-primary focus:outline-none focus:border-brand-nifty/40 transition-colors cursor-pointer"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-fg-muted">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Condition toggle */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider">
              Condition
            </label>
            <div className="flex rounded-md border border-terminal-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setCondition("above")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono font-bold transition-colors",
                  condition === "above"
                    ? "bg-state-buy/15 text-state-buy border-r border-state-buy/20"
                    : "bg-terminal-bg text-fg-muted border-r border-terminal-border/60 hover:text-fg-secondary"
                )}
              >
                <ArrowUp size={12} />
                Above
              </button>
              <button
                type="button"
                onClick={() => setCondition("below")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono font-bold transition-colors",
                  condition === "below"
                    ? "bg-state-avoid/15 text-state-avoid"
                    : "bg-terminal-bg text-fg-muted hover:text-fg-secondary"
                )}
              >
                <ArrowDown size={12} />
                Below
              </button>
            </div>
          </div>

          {/* Threshold slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider">
                Threshold
              </label>
              <span className="text-xs font-mono font-bold text-fg-primary">
                {threshold}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${
                  condition === "above" ? "#00f5a0" : "#ff0055"
                } ${threshold}%, rgba(255,255,255,0.06) ${threshold}%)`,
              }}
            />
            <div className="flex justify-between text-[9px] font-mono text-fg-muted/40">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider">
              Notification Channels
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleChannel("telegram")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-bold transition-all",
                  channels.includes("telegram")
                    ? "border-[#0088cc]/40 bg-[#0088cc]/10 text-[#0088cc]"
                    : "border-terminal-border/40 bg-terminal-bg text-fg-muted hover:text-fg-secondary"
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
              </button>
              <button
                type="button"
                onClick={() => toggleChannel("email")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-bold transition-all",
                  channels.includes("email")
                    ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold"
                    : "border-terminal-border/40 bg-terminal-bg text-fg-muted hover:text-fg-secondary"
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                Email
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-fg-muted uppercase tracking-wider">
              Alert Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold Strong Buy Alert"
              className="w-full bg-terminal-bg border border-terminal-border/60 rounded-md px-3 py-2 text-xs font-mono text-fg-primary placeholder:text-fg-muted/40 focus:outline-none focus:border-brand-nifty/40 transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={channels.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all",
                channels.length > 0
                  ? "bg-brand-nifty/10 border border-brand-nifty/30 text-brand-nifty hover:bg-brand-nifty/20 hover:shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                  : "bg-terminal-bg border border-terminal-border/30 text-fg-muted cursor-not-allowed"
              )}
            >
              <Send size={12} />
              {editingRule ? "Update Rule" : "Create Rule"}
            </button>
            {(expanded || editingRule) && (
              <button
                type="button"
                onClick={() => {
                  if (editingRule) onCancel?.();
                  else setExpanded(false);
                }}
                className="px-3 py-2 rounded-md text-xs font-mono text-fg-muted hover:text-fg-secondary hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.form>
  );
}
