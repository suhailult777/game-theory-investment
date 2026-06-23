from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database.db import get_db
from app.database.models import MarketPrice, MacroIndicator, SentimentScore, InvestmentScore, DataQualityMetric
from app.database.models import NashEquilibrium, MarketRegime, StrategyFitness, GoogleTrendScore
from app.database.models import EnsembleScore, ModelCorrelation, FictitiousPlayResult, FTPLResult, MeanFieldResult
from app.core.stale_guard import staleness_report
from app.core.config import ASSETS_SCORED, ASSETS_MARKET, ASSETS_MACRO, MARKET_FALLBACK, MACRO_DEFAULTS
from app.core.log import get_logger
from app.core.data_quality import DataQualityMonitor
from app.scoring.game_theory.potential import optimize_potential_game_allocation
from app.scoring.game_theory.regime import get_regime_detector
from datetime import datetime, timezone

log = get_logger(__name__)
router = APIRouter()


def _latest_by_key(db, model, filter_field, filter_value, defaults=None):
    record = (
        db.query(model)
        .filter(filter_field == filter_value)
        .order_by(desc(model.timestamp))
        .first()
    )
    return record


def _fetch_latest_scores(db: Session):
    results = {}
    for asset in ASSETS_SCORED:
        record = _latest_by_key(db, InvestmentScore, InvestmentScore.asset, asset)
        if record:
            results[asset] = {
                "asset": record.asset,
                "score": float(record.total_score),
                "recommendation": record.recommendation,
                "details": record.details,
                "timestamp": record.timestamp.isoformat(),
            }
        else:
            results[asset] = {
                "asset": asset,
                "score": 50.0,
                "recommendation": "HOLD",
                "details": {
                    "base_score": 50,
                    "inflation": 0,
                    "usd_inr": 0,
                    "monetary_policy": 0,
                    "fear_index": 0,
                    "institutional_buying": 0,
                    "crowd_hype": 0,
                },
                "timestamp": None,
            }
    return results


def _fetch_latest_market_prices(db: Session):
    results = {}
    for asset in ASSETS_MARKET:
        record = _latest_by_key(db, MarketPrice, MarketPrice.asset, asset)
        if record:
            results[asset] = {
                "price": float(record.price),
                "currency": record.currency,
                "timestamp": record.timestamp.isoformat(),
            }
        else:
            fb = MARKET_FALLBACK[asset]
            results[asset] = {
                "price": fb["price"],
                "currency": fb["currency"],
                "timestamp": None,
            }
    return results


def _fetch_macro_indicators(db: Session):
    results = {}
    for macro in ASSETS_MACRO:
        record = _latest_by_key(db, MacroIndicator, MacroIndicator.indicator, macro)
        if record:
            results[macro] = {
                "value": float(record.value),
                "source": record.source,
                "timestamp": record.timestamp.isoformat(),
            }
        else:
            fb = MACRO_DEFAULTS[macro]
            results[macro] = {
                "value": fb["value"],
                "source": f"{fb['label']} Fallback",
                "timestamp": None,
            }
    return results


def _collect_timestamps(scores, prices, macros):
    timestamps = {}
    for asset, data in scores.items():
        ts = data.get("timestamp")
        timestamps[f"score_{asset}"] = datetime.fromisoformat(ts) if ts else None
    for asset, data in prices.items():
        ts = data.get("timestamp")
        timestamps[f"market_{asset}"] = datetime.fromisoformat(ts) if ts else None
    for macro, data in macros.items():
        ts = data.get("timestamp")
        timestamps[f"macro_{macro}"] = datetime.fromisoformat(ts) if ts else None
    return timestamps


@router.get("/scores/latest")
def get_latest_scores(db: Session = Depends(get_db)):
    scores = _fetch_latest_scores(db)
    timestamps = _collect_timestamps(scores, {}, {})
    scores["_staleness"] = staleness_report(timestamps)
    return scores


@router.get("/scores/history")
def get_score_history(
    asset: str = Query(..., description="Asset identifier"),
    limit: int = Query(30, description="Max historical points to query"),
    db: Session = Depends(get_db),
):
    records = (
        db.query(InvestmentScore)
        .filter(InvestmentScore.asset == asset)
        .order_by(desc(InvestmentScore.timestamp))
        .limit(limit)
        .all()
    )
    records.reverse()
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "score": float(r.total_score),
            "recommendation": r.recommendation,
        }
        for r in records
    ]


@router.get("/market/latest")
def get_latest_market_data(db: Session = Depends(get_db)):
    prices = _fetch_latest_market_prices(db)
    macros = _fetch_macro_indicators(db)
    combined = {**prices, **macros}
    timestamps = _collect_timestamps({}, prices, macros)
    combined["_staleness"] = staleness_report(timestamps)
    return combined


@router.get("/sentiment/news")
def get_latest_sentiment_news(
    limit: int = Query(10, description="Number of news articles to fetch"),
    db: Session = Depends(get_db),
):
    records = (
        db.query(SentimentScore)
        .order_by(desc(SentimentScore.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "headline": r.headline,
            "sentiment": float(r.sentiment),
            "source": r.source,
        }
        for r in records
    ]


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    scores = _fetch_latest_scores(db)
    prices = _fetch_latest_market_prices(db)
    macros = _fetch_macro_indicators(db)

    timestamps = _collect_timestamps(scores, prices, macros)
    categories = {
        "scores": staleness_report({k: v for k, v in timestamps.items() if k.startswith("score_")}),
        "market_prices": staleness_report({k: v for k, v in timestamps.items() if k.startswith("market_")}),
        "macro_indicators": staleness_report({k: v for k, v in timestamps.items() if k.startswith("macro_")}),
    }

    stale_count = sum(
        1 for cat in categories.values() for info in cat.values() if info["is_stale"]
    )

    return {
        "status": "degraded" if stale_count > 0 else "healthy",
        "stale_data_count": stale_count,
        "server_time_utc": datetime.now(timezone.utc).isoformat(),
        "categories": categories,
    }


@router.get("/health/data-quality")
def data_quality_health(
    hours: int = Query(24, description="Look-back window in hours"),
    db: Session = Depends(get_db),
):
    return DataQualityMonitor.summary(db, hours=hours)


@router.get("/game-theory/latest")
def get_latest_game_theory(db: Session = Depends(get_db)):
    nash_records = (
        db.query(NashEquilibrium)
        .order_by(desc(NashEquilibrium.timestamp))
        .limit(len(ASSETS_SCORED))
        .all()
    )
    regime = (
        db.query(MarketRegime)
        .order_by(desc(MarketRegime.timestamp))
        .first()
    )
    strategies = (
        db.query(StrategyFitness)
        .order_by(desc(StrategyFitness.timestamp))
        .limit(16)
        .all()
    )
    return {
        "nash": [
            {
                "timestamp": r.timestamp.isoformat(),
                "asset": r.asset,
                "equilibrium_found": r.equilibrium_found == "true",
                "num_equilibria": r.num_equilibria,
                "l2_distance": float(r.l2_distance) if r.l2_distance else None,
                "lambda_rationality": float(r.lambda_rationality) if r.lambda_rationality else None,
                "rationality_label": r.rationality_label,
            }
            for r in nash_records
        ],
        "regime": {
            "timestamp": regime.timestamp.isoformat(),
            "regime_index": regime.regime_index,
            "regime_label": regime.regime_label,
        } if regime else None,
        "strategies": [
            {
                "timestamp": r.timestamp.isoformat(),
                "asset": r.asset,
                "strategy": r.strategy_name,
                "fitness": float(r.fitness),
                "population_share": float(r.population_share),
                "is_dominant": r.is_dominant == "true",
            }
            for r in strategies
        ],
        "_staleness": staleness_report({
            "nash": nash_records[0].timestamp if nash_records else None,
            "regime": regime.timestamp if regime else None,
            "strategies": strategies[0].timestamp if strategies else None,
        }) if True else {},
    }


@router.get("/game-theory/regime")
def get_current_regime(db: Session = Depends(get_db)):
    regime = (
        db.query(MarketRegime)
        .order_by(desc(MarketRegime.timestamp))
        .first()
    )
    if regime:
        return {
            "timestamp": regime.timestamp.isoformat(),
            "regime_index": regime.regime_index,
            "regime_label": regime.regime_label,
            "modulators": regime.modulator_json,
        }
    return {"regime_index": None, "regime_label": "UNKNOWN"}


@router.get("/game-theory/portfolio")
def get_potential_game_portfolio(
    risk_aversion: float = Query(2.0, ge=0.5, le=10.0),
    db: Session = Depends(get_db),
):
    scores_data = {}
    for asset in ASSETS_SCORED:
        record = (
            db.query(InvestmentScore)
            .filter(InvestmentScore.asset == asset)
            .order_by(desc(InvestmentScore.timestamp))
            .first()
        )
        if record:
            scores_data[asset] = float(record.total_score)
        else:
            scores_data[asset] = 50.0
    weights = optimize_potential_game_allocation(scores_data, risk_aversion=risk_aversion)
    return {"weights": weights, "risk_aversion": risk_aversion}


@router.get("/trends/latest")
def get_latest_trends(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(GoogleTrendScore)
        .order_by(desc(GoogleTrendScore.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "keyword": r.keyword,
            "search_interest": float(r.search_interest),
            "trend_change_7d": float(r.trend_change_7d) if r.trend_change_7d else None,
            "source": r.source,
        }
        for r in records
    ]


@router.get("/game-theory/nash")
def get_nash_equilibria(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(NashEquilibrium)
        .order_by(desc(NashEquilibrium.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "equilibrium_found": r.equilibrium_found == "true",
            "num_equilibria": r.num_equilibria,
            "l2_distance": float(r.l2_distance) if r.l2_distance else None,
            "pure_nash_exists": r.pure_nash_exists == "true",
            "lambda_rationality": float(r.lambda_rationality) if r.lambda_rationality else None,
            "rationality_label": r.rationality_label,
            "regime_label": r.regime_label,
        }
        for r in records
    ]


# ---------------------------------------------------------------------------
# Phase 2 — Ensemble & ML Endpoints
# ---------------------------------------------------------------------------

@router.get("/ensemble/latest")
def get_ensemble_scores(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(EnsembleScore)
        .order_by(desc(EnsembleScore.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "ensemble_score": float(r.ensemble_score),
            "confidence": float(r.ensemble_confidence) if r.ensemble_confidence else None,
            "sub_model_scores": r.sub_model_scores,
            "mmc_score": float(r.mmc_score) if r.mmc_score else None,
            "weights_used": r.weights_used,
        }
        for r in records
    ]


@router.get("/ensemble/train")
def train_ensemble_models(db: Session = Depends(get_db)):
    from app.scoring.ml.ensemble import EnsembleTrainer
    trainer = EnsembleTrainer(db)
    results = trainer.train_all()
    return {
        "status": "completed",
        "results": {asset: "trained" if ok else "insufficient_data" for asset, ok in results.items()},
    }


@router.get("/ensemble/correlations")
def get_model_correlations(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(ModelCorrelation)
        .order_by(desc(ModelCorrelation.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "model_a": r.model_a,
            "model_b": r.model_b,
            "correlation": float(r.correlation),
            "num_samples": r.num_samples,
        }
        for r in records
    ]


@router.get("/fictitious-play/latest")
def get_fictitious_play(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(FictitiousPlayResult)
        .order_by(desc(FictitiousPlayResult.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "n_agents": r.n_agents,
            "equilibrium_distance": float(r.equilibrium_distance) if r.equilibrium_distance else None,
            "dominant_strategy": r.dominant_strategy,
            "action_distribution": r.action_distribution,
            "converged": r.converged == "true",
        }
        for r in records
    ]


@router.get("/ftpl/latest")
def get_ftpl_results(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(FTPLResult)
        .order_by(desc(FTPLResult.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "recommended_action": r.recommended_action,
            "regret": float(r.regret) if r.regret else None,
            "action_probabilities": r.action_probabilities,
        }
        for r in records
    ]


@router.get("/mean-field/latest")
def get_mean_field_results(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    records = (
        db.query(MeanFieldResult)
        .order_by(desc(MeanFieldResult.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "asset": r.asset,
            "retail_exposure_mean": float(r.retail_exposure_mean) if r.retail_exposure_mean else None,
            "retail_exposure_variance": float(r.retail_exposure_variance) if r.retail_exposure_variance else None,
            "optimal_strategy": r.optimal_strategy,
            "convergence": float(r.convergence) if r.convergence else None,
            "n_iterations": r.n_iterations,
        }
        for r in records
    ]


@router.get("/ml/latest")
def get_all_ml_signals(
    asset: str = Query(..., description="Asset identifier"),
    db: Session = Depends(get_db),
):
    ensemble = (
        db.query(EnsembleScore)
        .filter(EnsembleScore.asset == asset)
        .order_by(desc(EnsembleScore.timestamp))
        .first()
    )
    fp = (
        db.query(FictitiousPlayResult)
        .filter(FictitiousPlayResult.asset == asset)
        .order_by(desc(FictitiousPlayResult.timestamp))
        .first()
    )
    ftpl = (
        db.query(FTPLResult)
        .filter(FTPLResult.asset == asset)
        .order_by(desc(FTPLResult.timestamp))
        .first()
    )
    mfg = (
        db.query(MeanFieldResult)
        .filter(MeanFieldResult.asset == asset)
        .order_by(desc(MeanFieldResult.timestamp))
        .first()
    )

    return {
        "asset": asset,
        "ensemble": {
            "score": float(ensemble.ensemble_score) if ensemble else None,
            "confidence": float(ensemble.ensemble_confidence) if ensemble and ensemble.ensemble_confidence else None,
            "mmc_score": float(ensemble.mmc_score) if ensemble and ensemble.mmc_score else None,
        } if ensemble else None,
        "fictitious_play": {
            "dominant_strategy": fp.dominant_strategy,
            "equilibrium_distance": float(fp.equilibrium_distance) if fp and fp.equilibrium_distance else None,
            "action_distribution": fp.action_distribution,
        } if fp else None,
        "ftpl": {
            "recommended_action": ftpl.recommended_action,
            "regret": float(ftpl.regret) if ftpl and ftpl.regret else None,
            "action_probabilities": ftpl.action_probabilities,
        } if ftpl else None,
        "mean_field": {
            "retail_exposure_mean": float(mfg.retail_exposure_mean) if mfg and mfg.retail_exposure_mean else None,
            "optimal_strategy": mfg.optimal_strategy,
            "convergence": float(mfg.convergence) if mfg and mfg.convergence else None,
        } if mfg else None,
    }
