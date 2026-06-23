import pytest
import numpy as np
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.config import ASSETS_SCORED, GT_FP_N_AGENTS
from app.database.models import MarketPrice, MacroIndicator, SentimentScore, InvestmentScore


def approx(val, digits=2):
    return round(float(val), digits)


def _seed_training_data(db: Session):
    now = datetime.now(timezone.utc)
    for i in range(60):
        day = now - timedelta(days=i)
        db.add(MarketPrice(
            timestamp=day, asset="gold", price=2400.0 + i * 0.5,
            currency="USD", source="test",
        ))
        db.add(MarketPrice(
            timestamp=day, asset="silver", price=30.0 + i * 0.05,
            currency="USD", source="test",
        ))
        db.add(MarketPrice(
            timestamp=day, asset="nifty", price=22500.0 + i * 10,
            currency="INR", source="test",
        ))
        db.add(MarketPrice(
            timestamp=day, asset="real_estate", price=500.0 + i * 0.3,
            currency="INR", source="test",
        ))
        db.add(MarketPrice(
            timestamp=day, asset="usd_inr", price=83.5 + i * 0.01,
            currency="INR", source="test",
        ))
        db.add(MarketPrice(
            timestamp=day, asset="india_vix", price=15.0 + np.sin(i * 0.5) * 3,
            currency="POINTS", source="test",
        ))
        db.add(MacroIndicator(
            timestamp=day, indicator="inflation", value=5.0 + np.sin(i * 0.3) * 0.5,
            source="test",
        ))
        db.add(MacroIndicator(
            timestamp=day, indicator="repo_rate", value=6.0 + np.sin(i * 0.2) * 0.3,
            source="test",
        ))
        db.add(MacroIndicator(
            timestamp=day, indicator="fii_net_flow", value=np.random.randint(-2000, 2000),
            source="test",
        ))
        db.add(MacroIndicator(
            timestamp=day, indicator="dii_net_flow", value=np.random.randint(-1000, 1000),
            source="test",
        ))
    for asset in ASSETS_SCORED:
        for i in range(30):
            day = now - timedelta(days=i)
            db.add(SentimentScore(
                timestamp=day, asset=asset, sentiment=np.random.uniform(-0.5, 0.5),
                headline=f"news {asset} {i}", source="test",
            ))
            db.add(InvestmentScore(
                timestamp=day, asset=asset, total_score=50 + np.random.randint(-20, 20),
                recommendation="HOLD", details={"test": 1},
            ))
    db.commit()


class TestEnsemble:
    def test_build_features(self, db_session):
        from app.scoring.ml.ensemble import build_features_for_asset
        _seed_training_data(db_session)
        features = build_features_for_asset(db_session, "gold", datetime.now(timezone.utc))
        assert len(features) == 17
        assert not np.any(np.isnan(features))

    def test_build_training_data(self, db_session):
        from app.scoring.ml.ensemble import build_training_data
        _seed_training_data(db_session)
        X, y = build_training_data(db_session, "gold")
        if X is not None:
            assert X.shape[1] == 17
            assert len(X) == len(y) >= 20

    def test_compute_mmc(self, db_session):
        from app.scoring.ml.ensemble import compute_mmc
        preds = {
            "xgboost": np.random.randn(50).tolist(),
            "lightgbm": np.random.randn(50).tolist(),
            "logistic": np.random.randn(50).tolist(),
            "neural_net": np.random.randn(50).tolist(),
        }
        result = compute_mmc(preds)
        assert "correlations" in result
        assert "mmc_scores" in result
        for m in preds:
            assert m in result["mmc_scores"]
            assert 0 <= result["mmc_scores"][m] <= 1.0

    def test_train_and_predict(self, db_session):
        from app.scoring.ml.ensemble import EnsembleTrainer, EnsemblePredictor
        _seed_training_data(db_session)
        trainer = EnsembleTrainer(db_session)
        ok = trainer.train_for_asset("gold")
        if ok:
            predictor = EnsemblePredictor(db_session)
            result = predictor.predict("gold", datetime.now(timezone.utc))
            assert "ensemble_score" in result
            assert "confidence" in result
            assert "sub_scores" in result
            assert "mmc_score" in result

    def test_predict_without_training(self, db_session):
        from app.scoring.ml.ensemble import EnsemblePredictor
        predictor = EnsemblePredictor(db_session)
        result = predictor.predict("nonexistent", datetime.now(timezone.utc))
        assert result["ensemble_score"] is None

    def test_train_all(self, db_session):
        from app.scoring.ml.ensemble import EnsembleTrainer
        _seed_training_data(db_session)
        trainer = EnsembleTrainer(db_session)
        results = trainer.train_all()
        assert isinstance(results, dict)
        for asset in ASSETS_SCORED:
            assert asset in results


class TestFictitiousPlay:
    def test_fp_signal_shape(self, db_session):
        from app.scoring.ml.fictitious_play import fictitious_play_signal
        mf = {
            "vix": 16.0, "inflation": 5.0, "repo_rate": 6.0,
            "sentiment": 0.1, "fii_flow": 500, "dii_flow": 200,
            "usd_inr": 83.5, "nash_distance": 0.3, "qre_lambda": 1.5,
            "regime": 0, "evolution_conc": 0.6, "trend_change": 5.0,
            "inst_flow_signal": 0.2, "carry": 0.0,
            "gold_return_1d": 0.01, "nifty_return_1d": 0.005,
        }
        result = fictitious_play_signal(mf)
        assert "score_contribution" in result
        assert "buy_fraction" in result
        assert "sell_fraction" in result
        assert "hold_fraction" in result
        assert "dominant_strategy" in result
        buy = result["buy_fraction"]
        sell = result["sell_fraction"]
        hold = result["hold_fraction"]
        assert approx(buy + sell + hold) == 1.0

    def test_fp_with_varied_regimes(self, db_session):
        from app.scoring.ml.fictitious_play import fictitious_play_signal
        regimes = [0, 1, 2, 3]
        for reg in regimes:
            mf = {
                "vix": 16.0, "inflation": 5.0, "repo_rate": 6.0,
                "sentiment": 0.1, "fii_flow": 500, "dii_flow": 200,
                "usd_inr": 83.5, "nash_distance": 0.3, "qre_lambda": 1.5,
                "regime": reg, "evolution_conc": 0.6, "trend_change": 5.0,
                "inst_flow_signal": 0.2, "carry": 0.0,
                "gold_return_1d": 0.01, "nifty_return_1d": 0.005,
            }
            result = fictitious_play_signal(mf)
            assert isinstance(result["score_contribution"], float)

    def test_fp_fallback_on_error(self, db_session):
        from app.scoring.ml.fictitious_play import fictitious_play_signal
        result = fictitious_play_signal({})
        assert "score_contribution" in result
        assert "dominant_strategy" in result


class TestFTPL:
    def test_ftpl_basic(self, db_session):
        from app.scoring.ml.ftpl import ftpl_signal
        mf = {
            "vix": 16.0, "inflation": 5.0, "repo_rate": 6.0,
            "sentiment": 0.1, "fii_flow": 500, "dii_flow": 200,
            "usd_inr": 83.5, "nash_distance": 0.3, "qre_lambda": 1.5,
            "regime": 0,
        }
        result = ftpl_signal(mf, n_rounds=30)
        assert "score_contribution" in result
        assert "recommended_action" in result
        assert "regret" in result
        assert "action_probabilities" in result
        probs = result["action_probabilities"]
        assert approx(probs["BUY"] + probs["SELL"] + probs["HOLD"]) == 1.0

    def test_ftpl_convergence(self, db_session):
        from app.scoring.ml.ftpl import ftpl_signal
        mf = {
            "vix": 30.0, "inflation": 7.0, "repo_rate": 7.5,
            "sentiment": -0.5, "fii_flow": -2000, "dii_flow": -1000,
            "usd_inr": 88.0, "nash_distance": 0.5, "qre_lambda": 0.5,
            "regime": 2,
        }
        result = ftpl_signal(mf, n_rounds=50)
        assert abs(result["score_contribution"]) <= 20

    def test_ftpl_strategy_object(self, db_session):
        from app.scoring.ml.ftpl import FTPLStrategy
        ftpl = FTPLStrategy(n_actions=3, eta=0.1, perturbation_scale=0.5)
        probs = ftpl.get_action_probabilities()
        assert len(probs) == 3
        assert abs(probs.sum() - 1.0) < 0.01


class TestMeanField:
    def test_mfg_basic(self, db_session):
        from app.scoring.ml.mean_field import mean_field_signal
        mf = {
            "vix": 16.0, "inflation": 5.0, "repo_rate": 6.0,
            "sentiment": 0.1, "fii_flow": 500, "dii_flow": 200,
            "regime": 0,
        }
        result = mean_field_signal(mf)
        assert "score_contribution" in result
        assert "retail_exposure_mean" in result
        assert "retail_exposure_variance" in result
        assert "optimal_strategy" in result
        assert "convergence" in result
        assert result["optimal_strategy"] in ("BUY", "SELL", "HOLD")

    def test_mfg_crisis_regime(self, db_session):
        from app.scoring.ml.mean_field import mean_field_signal
        mf = {
            "vix": 40.0, "inflation": 8.0, "repo_rate": 8.0,
            "sentiment": -0.8, "fii_flow": -5000, "dii_flow": -2000,
            "regime": 2,
        }
        result = mean_field_signal(mf)
        assert result["retail_exposure_mean"] <= 0.1

    def test_mfg_fallback(self, db_session):
        from app.scoring.ml.mean_field import mean_field_signal
        result = mean_field_signal({})
        assert result["optimal_strategy"] in ("BUY", "SELL", "HOLD")


class TestPhase2APIIntegration:
    def test_ensemble_endpoints(self, client, db_session):
        resp = client.get("/ensemble/latest")
        assert resp.status_code in (200, 404)

    def test_fp_endpoint(self, client, db_session):
        resp = client.get("/fictitious-play/latest")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_ftpl_endpoint(self, client, db_session):
        resp = client.get("/ftpl/latest")
        assert resp.status_code == 200

    def test_mean_field_endpoint(self, client, db_session):
        resp = client.get("/mean-field/latest")
        assert resp.status_code == 200

    def test_ml_signals_endpoint(self, client, db_session):
        resp = client.get("/ml/latest?asset=gold")
        assert resp.status_code == 200
        data = resp.json()
        assert data["asset"] == "gold"

    def test_ensemble_train_endpoint(self, client, db_session):
        _seed_training_data(db_session)
        resp = client.get("/ensemble/train")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"


class TestPhase2ScoringEngine:
    def test_engine_adds_phase2_factors(self, db_session, seed_neutral):
        from app.scoring.engine import calculate_scores
        calculate_scores(db_session)

        scores = (
            db_session.query(InvestmentScore)
            .order_by(InvestmentScore.asset)
            .all()
        )
        assert len(scores) == len(ASSETS_SCORED)
        for s in scores:
            details = s.details
            assert "ensemble_ml" in details
            assert "fictitious_play" in details
            assert "ftpl" in details
            assert "mean_field" in details

    def test_engine_phase2_factors_defaults(self, db_session, seed_neutral):
        from app.scoring.engine import calculate_scores
        calculate_scores(db_session)

        score = (
            db_session.query(InvestmentScore)
            .filter(InvestmentScore.asset == "gold")
            .first()
        )
        assert score is not None
        details = score.details
        assert isinstance(details["ensemble_ml"], (int, float))
        assert isinstance(details["fictitious_play"], (int, float))
        assert isinstance(details["ftpl"], (int, float))
        assert isinstance(details["mean_field"], (int, float))

    def test_db_persistence(self, db_session, seed_neutral):
        from app.scoring.engine import calculate_scores
        from app.database.models import FictitiousPlayResult, FTPLResult, MeanFieldResult
        calculate_scores(db_session)

        fps = db_session.query(FictitiousPlayResult).all()
        assert len(fps) >= 1

        ftpls = db_session.query(FTPLResult).all()
        assert len(ftpls) >= 1

        mfgs = db_session.query(MeanFieldResult).all()
        assert len(mfgs) >= 1
