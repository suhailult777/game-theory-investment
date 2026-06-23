from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.models import MarketPrice, MacroIndicator, SentimentScore, InvestmentScore, GoogleTrendScore
from app.database.models import NashEquilibrium, MarketRegime, StrategyFitness
from datetime import datetime, timezone, timedelta
from app.scoring.recommendation import generate_recommendation
from app.core.log import get_logger
from app.core.config import (
    ASSETS_SCORED,
    ENGINE_FALLBACK_PRICES,
    USD_INR_FALLBACK,
    USD_INR_MIN_DAYS,
    INFLATION_THRESHOLD,
    REPO_TIGHT,
    REPO_ACCOMMODATIVE,
    VIX_PANIC,
    VIX_COMPLACENCY,
    INST_STRONG_BUY,
    INST_STRONG_SELL,
    SENT_EUPHORIA,
    SENT_PANIC,
    GT_NASH_ENABLED, GT_NASH_WEIGHT,
    GT_QRE_ENABLED, GT_QRE_WEIGHT,
    GT_EVOLUTION_ENABLED, GT_EVOLUTION_WEIGHT,
    GT_REGIME_ENABLED, GT_REGIME_WEIGHT,
    GT_TRENDS_ENABLED, GT_TRENDS_WEIGHT, TRENDS_SURGE_THRESHOLD,
    GT_ENSEMBLE_ENABLED, GT_ENSEMBLE_WEIGHT,
    GT_FP_ENABLED, GT_FP_WEIGHT, GT_FP_N_AGENTS,
    GT_FTPL_ENABLED, GT_FTPL_WEIGHT,
    GT_MFG_ENABLED, GT_MFG_WEIGHT,
)
from app.scoring.game_theory.nash_model import build_retail_inst_payoffs, nash_equilibrium_signal
from app.scoring.game_theory.qre import compute_qre_signal
from app.scoring.game_theory.evolution import evolve_allocations, compute_evolutionary_signal
from app.scoring.game_theory.regime import get_regime_detector

from app.scoring.ml.ensemble import EnsemblePredictor
from app.scoring.ml.fictitious_play import fictitious_play_signal
from app.scoring.ml.ftpl import ftpl_signal
from app.scoring.ml.mean_field import mean_field_signal

log = get_logger(__name__)


def _get_usd_inr_threshold(db: Session) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    rows = (
        db.query(MarketPrice.price)
        .filter(MarketPrice.asset == "usd_inr", MarketPrice.timestamp >= cutoff)
        .all()
    )
    if len(rows) >= USD_INR_MIN_DAYS:
        prices = [float(r.price) for r in rows if r.price is not None]
        if prices:
            return sum(prices) / len(prices)
    return USD_INR_FALLBACK


def _get_latest_price(db: Session, asset: str, fallback: float) -> float:
    record = (
        db.query(MarketPrice)
        .filter(MarketPrice.asset == asset)
        .order_by(desc(MarketPrice.timestamp))
        .first()
    )
    return float(record.price) if record else fallback


def _get_latest_macro(db: Session, indicator: str, fallback: float) -> float:
    record = (
        db.query(MacroIndicator)
        .filter(MacroIndicator.indicator == indicator)
        .order_by(desc(MacroIndicator.timestamp))
        .first()
    )
    return float(record.value) if record else fallback


def _institutional_score(total_flow: float) -> int:
    if total_flow > INST_STRONG_BUY:
        return 15
    elif total_flow > 0:
        return 10
    elif total_flow < INST_STRONG_SELL:
        return -10
    return -5


def _persist_phase2_signals(db: Session, asset: str):
    from app.core.config import (
        GT_ENSEMBLE_ENABLED, GT_FP_ENABLED, GT_FTPL_ENABLED, GT_MFG_ENABLED,
    )
    from app.database.models import EnsembleScore, ModelCorrelation
    from app.database.models import FictitiousPlayResult, FTPLResult, MeanFieldResult
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    if GT_ENSEMBLE_ENABLED:
        try:
            predictor = EnsemblePredictor(db)
            if predictor.is_trained(asset):
                result = predictor.predict(asset, now)
                if result["ensemble_score"] is not None:
                    db.add(EnsembleScore(
                        timestamp=now, asset=asset,
                        ensemble_score=result["ensemble_score"],
                        ensemble_confidence=result["confidence"],
                        sub_model_scores=result.get("sub_scores"),
                        mmc_score=result.get("mmc_score"),
                        weights_used=None,
                    ))
        except Exception as e:
            log.warning("Failed to persist ensemble for %s: %s", asset, e)

    if GT_FP_ENABLED:
        try:
            sent_val = 0.0
            payoffs_r, payoffs_i = build_retail_inst_payoffs(sent_val, 0.0, 16.0, 5.1, 6.5)
            qre = compute_qre_signal(payoffs_r, payoffs_i)
            mf = {
                "vix": _get_latest_price(db, "india_vix", 16.0),
                "inflation": _get_latest_macro(db, "inflation", 5.1),
                "repo_rate": _get_latest_macro(db, "repo_rate", 6.5),
                "sentiment": sent_val,
                "fii_flow": _get_latest_macro(db, "fii_net_flow", 0.0),
                "dii_flow": _get_latest_macro(db, "dii_net_flow", 0.0),
                "usd_inr": _get_latest_price(db, "usd_inr", 83.5),
                "nash_distance": 0.5,
                "qre_lambda": qre.get("lambda_estimate", 0.0),
                "regime": 0,
                "evolution_conc": 0.5,
                "trend_change": 0.0,
                "inst_flow_signal": 0.0,
                "carry": 0.0,
                "gold_return_1d": 0.0,
                "nifty_return_1d": 0.0,
            }
            fp_sig = fictitious_play_signal(mf, n_agents=50)
            db.add(FictitiousPlayResult(
                timestamp=now, asset=asset,
                n_agents=50,
                equilibrium_distance=fp_sig["equilibrium_distance"],
                dominant_strategy=fp_sig["dominant_strategy"],
                action_distribution={
                    "BUY": fp_sig["buy_fraction"],
                    "SELL": fp_sig["sell_fraction"],
                    "HOLD": fp_sig["hold_fraction"],
                },
                strategy_distribution=None,
                converged="true",
            ))
        except Exception as e:
            log.warning("Failed to persist FP for %s: %s", asset, e)

    if GT_FTPL_ENABLED:
        try:
            sent_val = 0.0
            mf = {
                "vix": _get_latest_price(db, "india_vix", 16.0),
                "inflation": _get_latest_macro(db, "inflation", 5.1),
                "repo_rate": _get_latest_macro(db, "repo_rate", 6.5),
                "sentiment": sent_val,
                "fii_flow": _get_latest_macro(db, "fii_net_flow", 0.0),
                "dii_flow": _get_latest_macro(db, "dii_net_flow", 0.0),
                "usd_inr": _get_latest_price(db, "usd_inr", 83.5),
                "nash_distance": 0.5,
                "qre_lambda": 0.0,
                "regime": 0,
            }
            ftpl_sig = ftpl_signal(mf)
            db.add(FTPLResult(
                timestamp=now, asset=asset,
                recommended_action=ftpl_sig["recommended_action"],
                regret=ftpl_sig["regret"],
                action_probabilities=ftpl_sig["action_probabilities"],
            ))
        except Exception as e:
            log.warning("Failed to persist FTPL for %s: %s", asset, e)

    if GT_MFG_ENABLED:
        try:
            sent_val = 0.0
            mf = {
                "vix": _get_latest_price(db, "india_vix", 16.0),
                "inflation": _get_latest_macro(db, "inflation", 5.1),
                "repo_rate": _get_latest_macro(db, "repo_rate", 6.5),
                "sentiment": sent_val,
                "fii_flow": _get_latest_macro(db, "fii_net_flow", 0.0),
                "dii_flow": _get_latest_macro(db, "dii_net_flow", 0.0),
                "regime": 0,
            }
            mfg_sig = mean_field_signal(mf)
            db.add(MeanFieldResult(
                timestamp=now, asset=asset,
                retail_exposure_mean=mfg_sig["retail_exposure_mean"],
                retail_exposure_variance=mfg_sig["retail_exposure_variance"],
                optimal_strategy=mfg_sig["optimal_strategy"],
                convergence=mfg_sig["convergence"],
                position_distribution={"exposure_grid": {}},
                n_iterations=mfg_sig["n_iterations"],
            ))
        except Exception as e:
            log.warning("Failed to persist MFG for %s: %s", asset, e)


def calculate_scores(db: Session):
    log.info("Starting scoring calculation engine...")

    # ------------------------------------------------------------------
    # 0.  Gather data & detect regime
    # ------------------------------------------------------------------
    latest_prices = {}
    for asset in ASSETS_SCORED + ["usd_inr", "india_vix"]:
        latest_prices[asset] = _get_latest_price(db, asset, ENGINE_FALLBACK_PRICES.get(asset, 0.0))

    inflation = _get_latest_macro(db, "inflation", 5.10)
    repo_rate = _get_latest_macro(db, "repo_rate", 6.50)
    fii_flow = _get_latest_macro(db, "fii_net_flow", 0.0)
    dii_flow = _get_latest_macro(db, "dii_net_flow", 0.0)
    total_flow = fii_flow + dii_flow
    usd_inr_threshold = _get_usd_inr_threshold(db)

    usd_inr_val = latest_prices.get("usd_inr", 95.0)
    vix = latest_prices.get("india_vix", 16.0)

    twelve_hours_ago = datetime.now(timezone.utc) - timedelta(hours=12)
    latest_sentiments = {}
    for asset in ASSETS_SCORED:
        records = (
            db.query(SentimentScore)
            .filter(SentimentScore.asset == asset, SentimentScore.timestamp >= twelve_hours_ago)
            .all()
        )
        if records:
            latest_sentiments[asset] = sum(float(r.sentiment) for r in records) / len(records)
        else:
            latest_sentiments[asset] = 0.0

    # --- Regime detection -----------------------------------------------
    regime_index = 0
    regime_label = "RISK_ON"
    modulators = None
    if GT_REGIME_ENABLED:
        try:
            detector = get_regime_detector()
            regime_index, regime_label = detector.predict(db)
            modulators = detector.regime_to_factor_modulator(regime_index)
            log.info("Market regime detected: %s (index=%d)", regime_label, regime_index)
            db.add(MarketRegime(
                timestamp=datetime.now(timezone.utc),
                regime_index=regime_index,
                regime_label=regime_label,
                modulator_json=modulators,
            ))
        except Exception as e:
            log.warning("Regime detection failed: %s", e)

    # --- Ensemble predictor (shared across assets) --------------------
    ensemble_predictor = EnsemblePredictor(db) if GT_ENSEMBLE_ENABLED else None

    # --- Macro features dict for Phase 2 signals ----------------------
    macro_features = {
        "vix": vix,
        "inflation": inflation,
        "repo_rate": repo_rate,
        "sentiment": 0.0,
        "fii_flow": fii_flow,
        "dii_flow": dii_flow,
        "usd_inr": usd_inr_val,
        "nash_distance": 0.5,
        "qre_lambda": 0.0,
        "regime": regime_index,
        "evolution_conc": 0.5,
        "trend_change": 0.0,
        "inst_flow_signal": 0.0,
        "carry": 0.0,
        "gold_return_1d": 0.0,
        "nifty_return_1d": 0.0,
    }

    # ------------------------------------------------------------------
    # 4.  Score each asset
    # ------------------------------------------------------------------
    for asset in ASSETS_SCORED:
        score = 50
        breakdown = {
            "base_score": 50,
            "inflation": 0,
            "usd_inr": 0,
            "monetary_policy": 0,
            "fear_index": 0,
            "institutional_buying": 0,
            "crowd_hype": 0,
            "nash_distance": 0,
            "rationality": 0,
            "evolution": 0,
            "regime_mod": 0,
            "google_trends": 0,
            "ensemble_ml": 0,
            "fictitious_play": 0,
            "ftpl": 0,
            "mean_field": 0,
        }

        m = modulators if modulators else {}
        inf_mod = m.get("inflation_factor", 1.0)
        fx_mod = m.get("currency_factor", 1.0)
        mon_mod = m.get("monetary_factor", 1.0)
        vix_mod = m.get("vix_factor", 1.0)
        inst_mod = m.get("inst_factor", 1.0)
        sent_mod = m.get("sentiment_factor", 1.0)

        # --- FACTOR A: Inflation CPI -----------------------------------
        if inflation > INFLATION_THRESHOLD:
            if asset in ("gold", "silver", "real_estate"):
                val = int(round(10 * inf_mod))
                breakdown["inflation"] = val
                score += val
            elif asset == "nifty":
                val = int(round(-5 * inf_mod))
                breakdown["inflation"] = val
                score += val
        else:
            if asset == "nifty":
                val = int(round(5 * inf_mod))
                breakdown["inflation"] = val
                score += val

        # --- FACTOR B: Currency Stress ---------------------------------
        if usd_inr_val > usd_inr_threshold:
            if asset in ("gold", "silver"):
                val = int(round(10 * fx_mod))
                breakdown["usd_inr"] = val
                score += val
            elif asset == "nifty":
                val = int(round(-5 * fx_mod))
                breakdown["usd_inr"] = val
                score += val
        else:
            if asset == "nifty":
                val = int(round(5 * fx_mod))
                breakdown["usd_inr"] = val
                score += val

        # --- FACTOR C: Monetary Policy ---------------------------------
        if repo_rate > REPO_TIGHT:
            if asset in ("gold", "silver"):
                val = int(round(5 * mon_mod))
                breakdown["monetary_policy"] = val
                score += val
            elif asset in ("nifty", "real_estate"):
                val = int(round(-5 * mon_mod))
                breakdown["monetary_policy"] = val
                score += val
        elif repo_rate < REPO_ACCOMMODATIVE:
            if asset in ("gold", "silver"):
                val = int(round(-5 * mon_mod))
                breakdown["monetary_policy"] = val
                score += val
            elif asset in ("nifty", "real_estate"):
                val = int(round(5 * mon_mod))
                breakdown["monetary_policy"] = val
                score += val

        # --- FACTOR D: VIX ---------------------------------------------
        if vix > VIX_PANIC:
            if asset in ("gold", "nifty"):
                val = int(round(15 * vix_mod))
                breakdown["fear_index"] = val
                score += val
        elif vix < VIX_COMPLACENCY:
            if asset == "nifty":
                val = int(round(-10 * vix_mod))
                breakdown["fear_index"] = val
                score += val

        # --- FACTOR E: Institutional Flows -----------------------------
        if asset in ("gold", "silver", "nifty"):
            val = int(round(_institutional_score(total_flow) * inst_mod))
            breakdown["institutional_buying"] = val
            score += val
        elif asset == "real_estate":
            if total_flow > 1000:
                val = int(round(10 * inst_mod))
                breakdown["institutional_buying"] = val
                score += val
            elif total_flow < -1000:
                val = int(round(-5 * inst_mod))
                breakdown["institutional_buying"] = val
                score += val

        # --- FACTOR F: Sentiment Contrarian ----------------------------
        sent_val = latest_sentiments.get(asset, 0.0)
        if sent_val > SENT_EUPHORIA:
            val = int(round(-10 * sent_mod))
            breakdown["crowd_hype"] = val
            score += val
        elif sent_val < SENT_PANIC:
            val = int(round(10 * sent_mod))
            breakdown["crowd_hype"] = val
            score += val

        # --- FACTOR G: Nash Equilibrium Distance -----------------------
        if GT_NASH_ENABLED:
            try:
                payoffs_r, payoffs_i = build_retail_inst_payoffs(
                    sentiment=sent_val,
                    inst_flow=total_flow,
                    vix=vix,
                    inflation=inflation,
                    repo_rate=repo_rate,
                )
                nash_signal = nash_equilibrium_signal(payoffs_r, payoffs_i)
                if nash_signal["l2_distance"] is not None:
                    dist = nash_signal["l2_distance"]
                    # Close to equilibrium → neutral. Far from equilibrium → opportunity.
                    nash_score = round((0.5 - dist) * GT_NASH_WEIGHT)
                    breakdown["nash_distance"] = nash_score
                    score += nash_score
                    log.debug("Nash signal for %s: distance=%.3f, score=%d", asset, dist, nash_score)
            except Exception as e:
                log.warning("Nash computation failed for %s: %s", asset, e)

        # --- FACTOR H: Market Rationality (QRE λ) ----------------------
        if GT_QRE_ENABLED:
            try:
                payoffs_r, payoffs_i = build_retail_inst_payoffs(
                    sentiment=sent_val,
                    inst_flow=total_flow,
                    vix=vix,
                    inflation=inflation,
                    repo_rate=repo_rate,
                )
                qre_signal = compute_qre_signal(payoffs_r, payoffs_i)
                if qre_signal["is_efficient"]:
                    breakdown["rationality"] = int(round(GT_QRE_WEIGHT))
                    score += int(round(GT_QRE_WEIGHT))
                else:
                    breakdown["rationality"] = int(round(-GT_QRE_WEIGHT * 0.5))
                    score += int(round(-GT_QRE_WEIGHT * 0.5))
                log.debug("QRE signal for %s: λ=%.3f, label=%s", asset, qre_signal["lambda_estimate"], qre_signal["rationality_label"])
            except Exception as e:
                log.warning("QRE computation failed for %s: %s", asset, e)

        # --- FACTOR I: Strategy Evolution ------------------------------
        if GT_EVOLUTION_ENABLED:
            try:
                evolved = evolve_allocations(asset, breakdown, {})
                evo_signal = compute_evolutionary_signal(evolved)
                concentration = evo_signal["concentration"]
                # High concentration → one strategy dominates → clear signal
                # Low concentration → no clear edge → reduce score
                evo_val = int(round((concentration - 0.5) * GT_EVOLUTION_WEIGHT * 2))
                breakdown["evolution"] = evo_val
                score += evo_val
            except Exception as e:
                log.warning("Evolution computation failed for %s: %s", asset, e)

        # --- FACTOR K: Google Trends Crowd Sentiment -------------------
        if GT_TRENDS_ENABLED:
            try:
                trend_record = (
                    db.query(GoogleTrendScore)
                    .filter(GoogleTrendScore.asset == asset)
                    .order_by(desc(GoogleTrendScore.timestamp))
                    .first()
                )
                if trend_record and trend_record.trend_change_7d is not None:
                    change = float(trend_record.trend_change_7d)
                    if change > TRENDS_SURGE_THRESHOLD:
                        val = int(round(-GT_TRENDS_WEIGHT))
                        breakdown["google_trends"] = val
                        score += val
                    elif change < -TRENDS_SURGE_THRESHOLD:
                        val = int(round(GT_TRENDS_WEIGHT))
                        breakdown["google_trends"] = val
                        score += val
                    log.debug("Trends factor for %s: change=%.1f%%, score=%d", asset, change, breakdown["google_trends"])
            except Exception as e:
                log.warning("Trends factor failed for %s: %s", asset, e)

        # --- FACTOR L: Ensemble ML Score -------------------------------
        if GT_ENSEMBLE_ENABLED and ensemble_predictor is not None:
            try:
                if ensemble_predictor.is_trained(asset):
                    result = ensemble_predictor.predict(asset, datetime.now(timezone.utc))
                    if result["ensemble_score"] is not None:
                        raw = result["ensemble_score"]
                        confidence = result["confidence"]
                        mmc = result.get("mmc_score", 1.0)
                        adjusted = raw * mmc * 50
                        val = int(round(adjusted))
                        val = max(-GT_ENSEMBLE_WEIGHT, min(GT_ENSEMBLE_WEIGHT, val))
                        breakdown["ensemble_ml"] = val
                        score += val
                        log.debug("Ensemble ML signal for %s: raw=%.4f, conf=%.3f, mmc=%.3f, val=%d",
                                  asset, raw, confidence, mmc, val)
            except Exception as e:
                log.warning("Ensemble prediction failed for %s: %s", asset, e)

        # --- FACTOR M: Deep Fictitious Play ----------------------------
        if GT_FP_ENABLED:
            try:
                mf = dict(macro_features)
                mf["sentiment"] = sent_val
                mf["nash_distance"] = breakdown.get("nash_distance", 0) / (GT_NASH_WEIGHT or 1)
                fp_sig = fictitious_play_signal(mf, n_agents=GT_FP_N_AGENTS)
                val = int(round(fp_sig["score_contribution"]))
                val = max(-GT_FP_WEIGHT, min(GT_FP_WEIGHT, val))
                breakdown["fictitious_play"] = val
                score += val
                log.debug("Fictitious play for %s: buy=%.2f sell=%.2f val=%d",
                          asset, fp_sig["buy_fraction"], fp_sig["sell_fraction"], val)
            except Exception as e:
                log.warning("Fictitious play failed for %s: %s", asset, e)

        # --- FACTOR N: FTPL Coarse Correlated Equilibria ---------------
        if GT_FTPL_ENABLED:
            try:
                mf = dict(macro_features)
                mf["sentiment"] = sent_val
                ftpl_sig = ftpl_signal(mf)
                val = int(round(ftpl_sig["score_contribution"]))
                val = max(-GT_FTPL_WEIGHT, min(GT_FTPL_WEIGHT, val))
                breakdown["ftpl"] = val
                score += val
                log.debug("FTPL for %s: action=%s regret=%.4f val=%d",
                          asset, ftpl_sig["recommended_action"], ftpl_sig["regret"], val)
            except Exception as e:
                log.warning("FTPL failed for %s: %s", asset, e)

        # --- FACTOR O: Mean Field Game ---------------------------------
        if GT_MFG_ENABLED:
            try:
                mf = dict(macro_features)
                mf["sentiment"] = sent_val
                mfg_sig = mean_field_signal(mf)
                val = int(round(mfg_sig["score_contribution"]))
                val = max(-GT_MFG_WEIGHT, min(GT_MFG_WEIGHT, val))
                breakdown["mean_field"] = val
                score += val
                log.debug("Mean field for %s: exposure=%.4f strategy=%s val=%d",
                          asset, mfg_sig["retail_exposure_mean"], mfg_sig["optimal_strategy"], val)
            except Exception as e:
                log.warning("Mean field failed for %s: %s", asset, e)

        # --- Regime modulation marker ----------------------------------
        if modulators:
            breakdown["regime_mod"] = regime_index

        score = max(0, min(100, score))
        rec_label = generate_recommendation(score)

        db_score = InvestmentScore(
            timestamp=datetime.now(timezone.utc),
            asset=asset,
            total_score=score,
            recommendation=rec_label,
            details=breakdown,
        )
        db.add(db_score)
        log.info("GT-Score for %s: %s (%s) | regime=%s", asset, score, rec_label, regime_label)

    # --- Persist Phase 2 signals to DB --------------------------------
    for asset in ASSETS_SCORED:
        _persist_phase2_signals(db, asset)

    try:
        db.commit()
        log.info("Scoring calculation saved to database.")
    except Exception as e:
        db.rollback()
        log.error("DB commit error in scoring engine: %s", e)
