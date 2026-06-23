import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ASSET_THEMES, SEVERITY_COLORS } from "../lib/constants";
import AlertRulesTable from "../components/alerts/AlertRulesTable";
import CreateAlertRule from "../components/alerts/CreateAlertRule";
import AlertTimeline from "../components/alerts/AlertTimeline";
import NotificationChannels from "../components/alerts/NotificationChannels";
import AlertStatistics from "../components/alerts/AlertStatistics";
import {
  Shield,
  Zap,
  AlertTriangle,
  Clock,
  RefreshCw,
  Activity,
} from "lucide-react";

// ── LocalStorage helpers ──────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

// ── Default rules ─────────────────────────────────────────────────────

const DEFAULT_RULES = [
  {
    id: generateId(),
    asset: "gold",
    metric: "score",
    condition: "above",
    threshold: 75,
    channels: ["telegram", "email"],
    name: "Gold Strong Buy",
    enabled: true,
    created_at: "2026-05-28T10:00:00Z",
    last_triggered: "2026-06-01T14:30:00Z",
  },
  {
    id: generateId(),
    asset: "silver",
    metric: "score",
    condition: "below",
    threshold: 35,
    channels: ["telegram"],
    name: "Silver Avoid Signal",
    enabled: true,
    created_at: "2026-05-29T08:00:00Z",
    last_triggered: null,
  },
  {
    id: generateId(),
    asset: "nifty",
    metric: "score",
    condition: "above",
    threshold: 70,
    channels: ["telegram", "email"],
    name: "Nifty Rally Alert",
    enabled: true,
    created_at: "2026-05-30T12:00:00Z",
    last_triggered: "2026-06-02T09:15:00Z",
  },
  {
    id: generateId(),
    asset: "real_estate",
    metric: "score",
    condition: "below",
    threshold: 30,
    channels: ["email"],
    name: "Realty Exit Warning",
    enabled: false,
    created_at: "2026-06-01T16:00:00Z",
    last_triggered: null,
  },
  {
    id: generateId(),
    asset: "all",
    metric: "vix",
    condition: "above",
    threshold: 25,
    channels: ["telegram", "email"],
    name: "Market Panic VIX Spike",
    enabled: true,
    created_at: "2026-06-02T00:00:00Z",
    last_triggered: null,
  },
];

// ── Mock history generator ────────────────────────────────────────────

function generateMockAlertHistory() {
  const now = Date.now();
  const templates = [
    { asset: "gold", metric: "score", value: 78, threshold: 70, severity: "critical", message: "Gold Score crossed 70 → STRONG BUY" },
    { asset: "nifty", metric: "score", value: 72, threshold: 70, severity: "warning", message: "Nifty 50 Score crossed 70 → ACCUMULATE" },
    { asset: "silver", metric: "score", value: 32, threshold: 35, severity: "warning", message: "Silver Score dropped below 35 → HOLD" },
    { asset: "gold", metric: "score", value: 82, threshold: 75, severity: "critical", message: "Gold Score crossed 75 → STRONG BUY" },
    { asset: "real_estate", metric: "score", value: 28, threshold: 30, severity: "info", message: "Real Estate Score dropped below 30 → AVOID" },
    { asset: "nifty", metric: "score", value: 68, threshold: 70, severity: "info", message: "Nifty 50 approaching threshold 70 (at 68)" },
    { asset: "gold", metric: "price", value: 2385, threshold: 2350, severity: "critical", message: "Gold Price crossed $2,350 — breakout confirmed" },
    { asset: "silver", metric: "price", value: 28.2, threshold: 29, severity: "warning", message: "Silver Price dropped below $29.00" },
    { asset: "all", metric: "vix", value: 27.5, threshold: 25, severity: "critical", message: "India VIX spiked to 27.5 — market panic zone" },
    { asset: "nifty", metric: "score", value: 45, threshold: 50, severity: "info", message: "Nifty 50 Score dropped below 50 — trend weakening" },
    { asset: "gold", metric: "score", value: 65, threshold: 60, severity: "warning", message: "Gold Score crossed 60 upward — momentum building" },
    { asset: "silver", metric: "score", value: 55, threshold: 50, severity: "info", message: "Silver Score crossed 50 → ACCUMULATE zone" },
  ];

  return templates.map((t, i) => ({
    id: generateId() + i,
    rule_id: generateId(),
    timestamp: new Date(now - (i * 3 + Math.random() * 2) * 3600000).toISOString(),
    asset: t.asset,
    metric: t.metric,
    value: t.value,
    threshold: t.threshold,
    severity: t.severity,
    message: t.message,
    acknowledged: i > 3,
  }));
}

// ── Stat card component ───────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, pulse }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-terminal-border/40 bg-terminal-card p-3.5 flex items-center gap-3"
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}12`, color }}
      >
        <Icon size={16} />
      </div>
      <div>
        <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider">
          {label}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-lg font-mono font-bold text-fg-primary">
            {value}
          </span>
          {pulse && (
            <span className="w-2 h-2 rounded-full bg-state-buy animate-pulse" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function AlertEngine() {
  const [rules, setRules] = useState(() =>
    loadFromStorage("alert_rules", DEFAULT_RULES)
  );
  const [alerts, setAlerts] = useState(() =>
    loadFromStorage("alert_history", generateMockAlertHistory())
  );
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persist to localStorage
  useEffect(() => {
    saveToStorage("alert_rules", rules);
  }, [rules]);

  useEffect(() => {
    saveToStorage("alert_history", alerts);
  }, [alerts]);

  // Simulated initial load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Sort rules
  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField === "asset") {
        av = ASSET_THEMES[av]?.label || av;
        bv = ASSET_THEMES[bv]?.label || bv;
      }
      if (sortField === "last_triggered") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (sortDir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
  }, [rules, sortField, sortDir]);

  // Stats
  const activeCount = useMemo(
    () => rules.filter((r) => r.enabled).length,
    [rules]
  );

  const triggeredToday = useMemo(() => {
    const today = new Date().toDateString();
    return alerts.filter((a) => new Date(a.timestamp).toDateString() === today).length;
  }, [alerts]);

  const criticalUnacked = useMemo(
    () => alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length,
    [alerts]
  );

  // Handlers
  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const handleToggle = useCallback((id) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const handleDelete = useCallback((id) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleEdit = useCallback((rule) => {
    setEditingRule(rule);
  }, []);

  const handleCreateOrUpdate = useCallback(
    (rule) => {
      if (editingRule) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
        setEditingRule(null);
      } else {
        setRules((prev) => [...prev, rule]);
      }
    },
    [editingRule]
  );

  const handleAcknowledge = useCallback((id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  }, []);

  const handleResetRules = useCallback(() => {
    setRules(DEFAULT_RULES);
    setAlerts(generateMockAlertHistory());
  }, []);

  // Animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full gap-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-terminal-border/20 border-t-brand-nifty animate-spin" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">
          initializing alert matrix...
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
      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display font-black text-xl tracking-tight text-fg-primary">
            Alert Command Center
          </h2>
          <p className="text-[11px] text-fg-secondary mt-0.5">
            Threshold monitoring, notification routing, and alert intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleResetRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono font-bold border border-terminal-border/40 text-fg-muted hover:text-fg-secondary hover:border-terminal-border/60 transition-all bg-terminal-card/50"
          >
            <RefreshCw size={12} />
            Reset Demo
          </motion.button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-realty/10 border border-brand-realty/20 text-brand-realty">
            <span className="w-2 h-2 rounded-full bg-brand-realty animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
              System Live
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats ───────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <StatCard
          icon={Shield}
          label="Active Rules"
          value={activeCount}
          color="#00f5a0"
          pulse
        />
        <StatCard
          icon={Zap}
          label="Triggered Today"
          value={triggeredToday}
          color="#00f2fe"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical Alerts"
          value={criticalUnacked}
          color="#ff0055"
          pulse={criticalUnacked > 0}
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value="99.9%"
          color="#e2b740"
        />
      </motion.div>

      {/* ── Main Two-Column Layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left column: Rules + Create */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
          {/* Rules Table */}
          <div className="rounded-xl border border-terminal-border/40 bg-terminal-card/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border/30">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-brand-nifty" />
                <h3 className="text-xs font-mono font-bold text-fg-secondary uppercase tracking-wider">
                  Alert Rules
                </h3>
                <span className="text-[10px] font-mono text-fg-muted bg-terminal-bg/60 px-1.5 py-0.5 rounded">
                  {rules.length}
                </span>
              </div>
            </div>
            <div className="p-3">
              <AlertRulesTable
                rules={sortedRules}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
              />
            </div>
          </div>

          {/* Create Rule */}
          <div className="rounded-xl border border-terminal-border/40 bg-terminal-card/50 p-4">
            <CreateAlertRule
              onSubmit={handleCreateOrUpdate}
              onCancel={() => setEditingRule(null)}
              editingRule={editingRule}
            />
          </div>
        </motion.div>

        {/* Right column: Timeline + Channels + Stats */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
          {/* Alert Timeline */}
          <div className="rounded-xl border border-terminal-border/40 bg-terminal-card/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-brand-gold" />
              <h3 className="text-xs font-mono font-bold text-fg-secondary uppercase tracking-wider">
                Alert Timeline
              </h3>
            </div>
            <AlertTimeline alerts={alerts} onAcknowledge={handleAcknowledge} />
          </div>

          {/* Notification Channels */}
          <div className="rounded-xl border border-terminal-border/40 bg-terminal-card/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-realty">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <h3 className="text-xs font-mono font-bold text-fg-secondary uppercase tracking-wider">
                Notification Channels
              </h3>
            </div>
            <NotificationChannels />
          </div>

          {/* Alert Statistics */}
          <div className="rounded-xl border border-terminal-border/40 bg-terminal-card/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-nifty">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
              <h3 className="text-xs font-mono font-bold text-fg-secondary uppercase tracking-wider">
                Alert Statistics
              </h3>
            </div>
            <AlertStatistics alerts={alerts} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
