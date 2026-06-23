import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { ASSET_THEMES, SEVERITY_COLORS } from "../../lib/constants";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Send,
  Mail,
} from "lucide-react";

const METRICS = ["score", "price", "vix", "inflation", "fii_flow", "sentiment"];

const METRIC_LABELS = {
  score: "Composite Score",
  price: "Market Price",
  vix: "India VIX",
  inflation: "CPI Inflation",
  fii_flow: "FII Flow",
  sentiment: "Sentiment",
};

function getSeverityForRule(rule) {
  if (rule.threshold >= 70 || rule.threshold <= 20) return "critical";
  if (rule.threshold >= 55 || rule.threshold <= 35) return "warning";
  return "info";
}

export default function AlertRulesTable({
  rules,
  onToggle,
  onDelete,
  onEdit,
  onSort,
  sortField,
  sortDir,
}) {
  const columns = [
    { key: "enabled", label: "Status", sortable: false },
    { key: "asset", label: "Asset", sortable: true },
    { key: "metric", label: "Metric", sortable: true },
    { key: "condition", label: "Condition", sortable: true },
    { key: "channels", label: "Channels", sortable: false },
    { key: "last_triggered", label: "Last Triggered", sortable: true },
    { key: "actions", label: "", sortable: false },
  ];

  return (
    <div className="w-full overflow-x-auto">
      {/* Desktop table */}
      <table className="w-full text-left border-collapse hidden md:table">
        <thead>
          <tr className="border-b border-terminal-border/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-fg-muted",
                  col.sortable && "cursor-pointer hover:text-fg-secondary select-none"
                )}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                  )}
                  {col.sortable && sortField !== col.key && (
                    <ArrowUpDown size={10} className="opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {rules.map((rule, i) => {
              const severity = getSeverityForRule(rule);
              const borderColor = SEVERITY_COLORS[severity];
              const assetTheme = ASSET_THEMES[rule.asset] || ASSET_THEMES.gold;

              return (
                <motion.tr
                  key={rule.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className={cn(
                    "border-b border-terminal-border/20 group transition-colors",
                    rule.enabled ? "hover:bg-white/[0.02]" : "opacity-50"
                  )}
                  style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
                >
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onToggle(rule.id)}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors duration-300",
                        rule.enabled ? "bg-brand-realty/30" : "bg-white/5"
                      )}
                    >
                      <motion.div
                        layout
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full shadow-sm",
                          rule.enabled
                            ? "bg-brand-realty left-[calc(100%-18px)] shadow-[0_0_8px_rgba(0,245,160,0.4)]"
                            : "bg-fg-muted/50 left-0.5"
                        )}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border"
                      style={{
                        color: assetTheme.color,
                        borderColor: `${assetTheme.color}30`,
                        backgroundColor: `${assetTheme.color}10`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: assetTheme.color }}
                      />
                      {rule.asset === "all" ? "ALL" : assetTheme.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-mono text-fg-secondary">
                    {METRIC_LABELS[rule.metric] || rule.metric}
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                          rule.condition === "above"
                            ? "bg-state-buy/10 text-state-buy"
                            : "bg-state-avoid/10 text-state-avoid"
                        )}
                      >
                        {rule.condition === "above" ? "↑" : "↓"} {rule.condition}
                      </span>
                      <span className="text-xs font-mono font-bold text-fg-primary">
                        {rule.threshold}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {rule.channels.includes("telegram") && (
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-[#0088cc]/10 text-[#0088cc]">
                          <Send size={12} />
                        </div>
                      )}
                      {rule.channels.includes("email") && (
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-brand-gold/10 text-brand-gold">
                          <Mail size={12} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px] font-mono text-fg-muted">
                    {rule.last_triggered
                      ? new Date(rule.last_triggered).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(rule)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5 text-fg-muted hover:text-brand-nifty transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDelete(rule.id)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-state-avoid/10 text-fg-muted hover:text-state-avoid transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        <AnimatePresence>
          {rules.map((rule, i) => {
            const severity = getSeverityForRule(rule);
            const borderColor = SEVERITY_COLORS[severity];
            const assetTheme = ASSET_THEMES[rule.asset] || ASSET_THEMES.gold;

            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className={cn(
                  "rounded-lg border bg-terminal-card p-3 space-y-2.5",
                  !rule.enabled && "opacity-50"
                )}
                style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border"
                    style={{
                      color: assetTheme.color,
                      borderColor: `${assetTheme.color}30`,
                      backgroundColor: `${assetTheme.color}10`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: assetTheme.color }}
                    />
                    {rule.asset === "all" ? "ALL" : assetTheme.label}
                  </span>
                  <button
                    onClick={() => onToggle(rule.id)}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors duration-300",
                      rule.enabled ? "bg-brand-realty/30" : "bg-white/5"
                    )}
                  >
                    <motion.div
                      layout
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full shadow-sm",
                        rule.enabled
                          ? "bg-brand-realty left-[calc(100%-18px)] shadow-[0_0_8px_rgba(0,245,160,0.4)]"
                          : "bg-fg-muted/50 left-0.5"
                      )}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-fg-muted">{METRIC_LABELS[rule.metric] || rule.metric}</span>
                  <span className="text-fg-muted/40">·</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded",
                      rule.condition === "above"
                        ? "bg-state-buy/10 text-state-buy"
                        : "bg-state-avoid/10 text-state-avoid"
                    )}
                  >
                    {rule.condition === "above" ? "↑" : "↓"} {rule.threshold}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {rule.channels.includes("telegram") && (
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-[#0088cc]/10 text-[#0088cc]">
                        <Send size={10} />
                      </div>
                    )}
                    {rule.channels.includes("email") && (
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-brand-gold/10 text-brand-gold">
                        <Mail size={10} />
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-fg-muted ml-2">
                      {rule.last_triggered ? "Triggered" : "Never fired"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(rule)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5 text-fg-muted hover:text-brand-nifty transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDelete(rule.id)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-state-avoid/10 text-fg-muted hover:text-state-avoid transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-8 text-fg-muted text-xs font-mono">
          No alert rules configured. Create one below.
        </div>
      )}
    </div>
  );
}
