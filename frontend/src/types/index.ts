export type Asset = "gold" | "silver" | "nifty" | "real_estate";
export type Recommendation = "STRONG BUY" | "ACCUMULATE" | "HOLD" | "AVOID";
export type MarketRegime = "RISK_ON" | "RISK_OFF" | "CRISIS" | "TRANSITION";

export interface ScoreBreakdown {
  base_score: number;
  inflation: number;
  usd_inr: number;
  monetary_policy: number;
  fear_index: number;
  institutional_buying: number;
  crowd_hype: number;
  nash_distance: number;
  rationality: number;
  evolution: number;
  regime_mod: number;
  google_trends: number;
  ensemble_ml: number;
  fictitious_play: number;
  ftpl: number;
  mean_field: number;
}

export interface ScoreData {
  asset: Asset;
  score: number;
  recommendation: Recommendation;
  details: ScoreBreakdown;
  timestamp: string | null;
  _staleness?: Record<string, unknown>;
}

export interface MarketPrice {
  price: number;
  currency: string;
  timestamp: string | null;
}

export interface MacroIndicator {
  value: number;
  source: string;
  timestamp: string | null;
}

export interface NewsItem {
  timestamp: string;
  asset: Asset;
  headline: string;
  sentiment: number;
  source: string;
}

export interface NashEquilibriumData {
  timestamp: string;
  asset: Asset;
  equilibrium_found: boolean;
  num_equilibria: number;
  l2_distance: number | null;
  pure_nash_exists: boolean;
  lambda_rationality: number | null;
  rationality_label: string | null;
  regime_label: string | null;
}

export interface GameTheoryLatest {
  nash: NashEquilibriumData[];
  regime: {
    timestamp: string;
    regime_index: number;
    regime_label: string;
  } | null;
  strategies: Array<{
    timestamp: string;
    asset: Asset;
    strategy: string;
    fitness: number;
    population_share: number;
    is_dominant: boolean;
  }>;
}

export interface EnsembleScore {
  timestamp: string;
  asset: Asset;
  ensemble_score: number;
  confidence: number | null;
  sub_model_scores: Record<string, number> | null;
  mmc_score: number | null;
  weights_used: Record<string, number> | null;
}

export interface FictitiousPlayResult {
  timestamp: string;
  asset: Asset;
  n_agents: number;
  equilibrium_distance: number | null;
  dominant_strategy: string | null;
  action_distribution: Record<string, number> | null;
  converged: boolean;
}

export interface FTPLResult {
  timestamp: string;
  asset: Asset;
  recommended_action: string | null;
  regret: number | null;
  action_probabilities: Record<string, number> | null;
}

export interface MeanFieldResult {
  timestamp: string;
  asset: Asset;
  retail_exposure_mean: number | null;
  retail_exposure_variance: number | null;
  optimal_strategy: string | null;
  convergence: number | null;
  n_iterations: number | null;
}

export interface MLSignals {
  asset: Asset;
  ensemble: {
    score: number;
    confidence: number | null;
    mmc_score: number | null;
  } | null;
  fictitious_play: {
    dominant_strategy: string | null;
    equilibrium_distance: number | null;
    action_distribution: Record<string, number> | null;
  } | null;
  ftpl: {
    recommended_action: string | null;
    regret: number | null;
    action_probabilities: Record<string, number> | null;
  } | null;
  mean_field: {
    retail_exposure_mean: number | null;
    optimal_strategy: string | null;
    convergence: number | null;
  } | null;
}

export interface ScoreHistoryPoint {
  timestamp: string;
  score: number;
  recommendation: string;
}

export interface AlertRule {
  id: string;
  asset: Asset | "all";
  metric: string;
  condition: "above" | "below";
  threshold: number;
  channels: Array<"telegram" | "email">;
  name: string;
  enabled: boolean;
  created_at: string;
  last_triggered: string | null;
}

export interface AlertHistoryEntry {
  id: string;
  rule_id: string;
  timestamp: string;
  asset: Asset;
  metric: string;
  value: number;
  threshold: number;
  severity: "critical" | "warning" | "info";
  message: string;
  acknowledged: boolean;
}

export interface RiskMetrics {
  asset: Asset;
  var_95: number;
  var_99: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  current_drawdown: number;
  volatility_30d: number;
  beta: number;
}
