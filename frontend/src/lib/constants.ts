export const ASSET_THEMES = {
  gold: { color: "#e2b740", label: "Gold", glowClass: "glow-gold" },
  silver: { color: "#94a3b8", label: "Silver", glowClass: "glow-silver" },
  nifty: { color: "#00f2fe", label: "Nifty 50", glowClass: "glow-nifty" },
  real_estate: { color: "#00f5a0", label: "Real Estate", glowClass: "glow-realty" },
} as const;

export const RECOMMENDATION_COLORS = {
  "STRONG BUY": "#00f5a0",
  "ACCUMULATE": "#00b0ff",
  "HOLD": "#ffd600",
  "AVOID": "#ff0055",
} as const;

export const REGIME_COLORS = {
  RISK_ON: "#00f5a0",
  RISK_OFF: "#ffd600",
  CRISIS: "#ff0055",
  TRANSITION: "#00b0ff",
} as const;

export const SEVERITY_COLORS = {
  critical: "#ff0055",
  warning: "#ffd600",
  info: "#00b0ff",
} as const;

export const ASSETS = ["gold", "silver", "nifty", "real_estate"] as const;
