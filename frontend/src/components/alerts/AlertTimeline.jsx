import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { SEVERITY_COLORS, ASSET_THEMES } from "../../lib/constants";
import { Check, Filter } from "lucide-react";

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SEVERITY_FILTERS = ["all", "critical", "warning", "info"];

export default function AlertTimeline({ alerts, onAcknowledge }) {
  const [filter, setFilter] = useState("all");
  const scrollRef = useRef(null);

  const filtered = filter === "all"
    ? alerts
    : alerts.filter((a) => a.severity === filter);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [filter]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-terminal-bg border border-terminal-border/30 mb-3">
        {SEVERITY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all",
              filter === f
                ? f === "all"
                  ? "bg-white/5 text-fg-primary"
                  : `text-white`
                : "text-fg-muted hover:text-fg-secondary hover:bg-white/[0.02]"
            )}
            style={
              filter === f && f !== "all"
                ? {
                    backgroundColor: `${SEVERITY_COLORS[f]}15`,
                    color: SEVERITY_COLORS[f],
                  }
                : undefined
            }
          >
            {f !== "all" && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[f] }}
              />
            )}
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-0 pr-1 max-h-[420px] md:max-h-[520px]"
      >
        {filtered.length === 0 && (
          <div className="text-center py-12 text-fg-muted text-xs font-mono">
            No {filter !== "all" ? filter : ""} alerts to display
          </div>
        )}

        <AnimatePresence>
          {filtered.map((alert, i) => {
            const severityColor = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info;
            const assetTheme = ASSET_THEMES[alert.asset] || ASSET_THEMES.gold;
            const isNew = Date.now() - new Date(alert.timestamp).getTime() < 600000;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="relative flex gap-3 group"
              >
                {/* Severity dot + line */}
                <div className="flex flex-col items-center pt-1">
                  <div className="relative">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: severityColor }}
                    />
                    {isNew && (
                      <div
                        className="absolute inset-0 w-2.5 h-2.5 rounded-full pulse-ring-active"
                        style={{ backgroundColor: severityColor, opacity: 0.5 }}
                      />
                    )}
                  </div>
                  {i < filtered.length - 1 && (
                    <div className="w-px flex-1 bg-terminal-border/30 my-1" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 pb-4 pt-0.5",
                    alert.acknowledged && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            color: assetTheme.color,
                            backgroundColor: `${assetTheme.color}10`,
                          }}
                        >
                          {alert.asset === "all" ? "ALL" : assetTheme.label}
                        </span>
                        <span className="text-[10px] font-mono text-fg-muted">
                          {relativeTime(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-fg-primary leading-relaxed">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-fg-muted">
                        <span>
                          Value: <span className="text-fg-secondary font-bold">{alert.value}</span>
                        </span>
                        <span className="text-fg-muted/30">|</span>
                        <span>
                          Threshold: <span className="text-fg-secondary font-bold">{alert.threshold}</span>
                        </span>
                      </div>
                    </div>

                    {/* Acknowledge */}
                    {!alert.acknowledged && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onAcknowledge(alert.id)}
                        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center border border-terminal-border/40 hover:border-brand-realty/30 hover:bg-brand-realty/10 text-fg-muted hover:text-brand-realty transition-all"
                        title="Acknowledge"
                      >
                        <Check size={12} />
                      </motion.button>
                    )}
                    {alert.acknowledged && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-fg-muted/30">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
