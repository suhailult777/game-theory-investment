"""
Centralised game-theory scoring thresholds.

Every numeric threshold lives here so it can be tuned without hunting
through the codebase.  Values can be overridden via environment variables.
"""
import os


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is not None:
        try:
            return float(raw)
        except ValueError:
            pass
    return default


# ---------------------------------------------------------------------------
# Currency stress  (Factor B)
# ---------------------------------------------------------------------------
# When fewer than USD_INR_MIN_DAYS days of historical USD/INR data exist,
# this fallback is used as the dynamic-average threshold.
USD_INR_FALLBACK = _env_float("USD_INR_FALLBACK", 90.0)
USD_INR_MIN_DAYS = int(os.getenv("USD_INR_MIN_DAYS", "30"))

# ---------------------------------------------------------------------------
# Inflation CPI  (Factor A)
# ---------------------------------------------------------------------------
INFLATION_THRESHOLD = _env_float("INFLATION_THRESHOLD", 5.0)

# ---------------------------------------------------------------------------
# Repo rate  (Factor C)
# ---------------------------------------------------------------------------
REPO_TIGHT = _env_float("REPO_TIGHT", 6.0)
REPO_ACCOMMODATIVE = _env_float("REPO_ACCOMMODATIVE", 5.0)

# ---------------------------------------------------------------------------
# VIX / Fear  (Factor D)
# ---------------------------------------------------------------------------
VIX_PANIC = _env_float("VIX_PANIC", 22.0)
VIX_COMPLACENCY = _env_float("VIX_COMPLACENCY", 12.0)

# ---------------------------------------------------------------------------
# Institutional flows  (Factor E)
# ---------------------------------------------------------------------------
INST_STRONG_BUY = _env_float("INST_STRONG_BUY", 1500.0)
INST_STRONG_SELL = _env_float("INST_STRONG_SELL", -1500.0)

# ---------------------------------------------------------------------------
# Sentiment / Crowd psychology  (Factor F)
# ---------------------------------------------------------------------------
SENT_EUPHORIA = _env_float("SENT_EUPHORIA", 0.50)
SENT_PANIC = _env_float("SENT_PANIC", -0.30)

# ---------------------------------------------------------------------------
# Asset definitions  — single source of truth
# ---------------------------------------------------------------------------
ASSETS_SCORED = ["gold", "silver", "nifty", "real_estate"]
ASSETS_MARKET = ["gold", "silver", "nifty", "real_estate", "usd_inr", "india_vix"]
ASSETS_MACRO = ["repo_rate", "inflation", "fii_net_flow", "dii_net_flow"]

YF_TICKERS = {
    "gold": "GC=F",
    "silver": "SI=F",
    "nifty": "^NSEI",
    "real_estate": "^CNXREALTY",
    "usd_inr": "INR=X",
    "india_vix": "^INDIAVIX",
}

YF_CURRENCIES = {
    "gold": "USD",
    "silver": "USD",
    "nifty": "INR",
    "real_estate": "INR",
    "usd_inr": "INR",
    "india_vix": "POINTS",
}

# Fallback prices when no DB data exists
MARKET_FALLBACK = {
    "gold": {"price": 2350.0, "currency": "USD"},
    "silver": {"price": 30.2, "currency": "USD"},
    "nifty": {"price": 22520.0, "currency": "INR"},
    "real_estate": {"price": 350.0, "currency": "INR"},
    "usd_inr": {"price": 83.5, "currency": "INR"},
    "india_vix": {"price": 15.0, "currency": "POINTS"},
}

MACRO_DEFAULTS = {
    "repo_rate": {"value": 6.50, "label": "RBI/MoSPI"},
    "inflation": {"value": 5.10, "label": "RBI/MoSPI"},
    "fii_net_flow": {"value": 0.0, "label": "Moneycontrol"},
    "dii_net_flow": {"value": 0.0, "label": "Moneycontrol"},
}

# Engine fallback prices when yfinance fails
ENGINE_FALLBACK_PRICES = {
    "gold": 4500.0,
    "silver": 75.0,
    "nifty": 23500.0,
    "real_estate": 780.0,
    "usd_inr": 95.0,
    "india_vix": 16.0,
}

# ---------------------------------------------------------------------------
# Game-Theory engine configuration
# ---------------------------------------------------------------------------
GT_NASH_ENABLED = os.getenv("GT_NASH_ENABLED", "true").lower() == "true"
GT_QRE_ENABLED = os.getenv("GT_QRE_ENABLED", "true").lower() == "true"
GT_EVOLUTION_ENABLED = os.getenv("GT_EVOLUTION_ENABLED", "true").lower() == "true"
GT_REGIME_ENABLED = os.getenv("GT_REGIME_ENABLED", "true").lower() == "true"
GT_POTENTIAL_ENABLED = os.getenv("GT_POTENTIAL_ENABLED", "true").lower() == "true"

# How much the game-theory signals affect the base score (0-100 contribution)
GT_NASH_WEIGHT = _env_float("GT_NASH_WEIGHT", 8.0)
GT_QRE_WEIGHT = _env_float("GT_QRE_WEIGHT", 5.0)
GT_EVOLUTION_WEIGHT = _env_float("GT_EVOLUTION_WEIGHT", 5.0)
GT_REGIME_WEIGHT = _env_float("GT_REGIME_WEIGHT", 10.0)

# Regime detection retrain interval (hours)
GT_REGIME_RETRAIN_HOURS = int(os.getenv("GT_REGIME_RETRAIN_HOURS", "24"))

# ---------------------------------------------------------------------------
# Google Trends  (Factor K)
# ---------------------------------------------------------------------------
GT_TRENDS_ENABLED = os.getenv("GT_TRENDS_ENABLED", "true").lower() == "true"
GT_TRENDS_WEIGHT = _env_float("GT_TRENDS_WEIGHT", 5.0)
TRENDS_SURGE_THRESHOLD = _env_float("TRENDS_SURGE_THRESHOLD", 20.0)
TRENDS_COLLECT_HOURS = int(os.getenv("TRENDS_COLLECT_HOURS", "6"))

# ---------------------------------------------------------------------------
# Phase 2 — Ensemble Meta-Model (Factor L)
# ---------------------------------------------------------------------------
GT_ENSEMBLE_ENABLED = os.getenv("GT_ENSEMBLE_ENABLED", "true").lower() == "true"
GT_ENSEMBLE_WEIGHT = _env_float("GT_ENSEMBLE_WEIGHT", 10.0)
GT_ENSEMBLE_TRAIN_HOURS = int(os.getenv("GT_ENSEMBLE_TRAIN_HOURS", "168"))

# ---------------------------------------------------------------------------
# Phase 2 — Deep Fictitious Play (Factor M)
# ---------------------------------------------------------------------------
GT_FP_ENABLED = os.getenv("GT_FP_ENABLED", "true").lower() == "true"
GT_FP_WEIGHT = _env_float("GT_FP_WEIGHT", 6.0)
GT_FP_N_AGENTS = int(os.getenv("GT_FP_N_AGENTS", "50"))

# ---------------------------------------------------------------------------
# Phase 2 — FTPL Coarse Correlated Equilibria (Factor N)
# ---------------------------------------------------------------------------
GT_FTPL_ENABLED = os.getenv("GT_FTPL_ENABLED", "true").lower() == "true"
GT_FTPL_WEIGHT = _env_float("GT_FTPL_WEIGHT", 6.0)

# ---------------------------------------------------------------------------
# Phase 2 — Mean Field Game (Factor O)
# ---------------------------------------------------------------------------
GT_MFG_ENABLED = os.getenv("GT_MFG_ENABLED", "true").lower() == "true"
GT_MFG_WEIGHT = _env_float("GT_MFG_WEIGHT", 6.0)
