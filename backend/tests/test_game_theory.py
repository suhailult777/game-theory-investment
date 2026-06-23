import pytest
import numpy as np
from datetime import datetime, timezone


def approx(val, digits=2):
    return round(float(val), digits)


def _default_payoffs():
    from app.scoring.game_theory.nash_model import build_retail_inst_payoffs
    return build_retail_inst_payoffs(sentiment=0.1, inst_flow=0, vix=15, inflation=5, repo_rate=6)


class TestNashModel:
    def test_nash_signal_computes(self):
        from app.scoring.game_theory.nash_model import nash_equilibrium_signal
        result = nash_equilibrium_signal(*_default_payoffs())
        assert "l2_distance" in result
        assert "num_equilibria" in result
        assert "equilibrium_found" in result
        assert "pure_nash_exists" in result
        assert "eq_distances" in result
        assert isinstance(result["l2_distance"], float)
        assert isinstance(result["num_equilibria"], int)
        assert result["l2_distance"] >= 0

    def test_nash_signal_range(self):
        from app.scoring.game_theory.nash_model import nash_equilibrium_signal
        for _ in range(3):
            result = nash_equilibrium_signal(*_default_payoffs())
            assert result["l2_distance"] <= 10.0, "l2 seems unreasonably large"

    def test_payoff_matrices_shape(self):
        from app.scoring.game_theory.nash_model import build_retail_inst_payoffs
        retail, inst = build_retail_inst_payoffs(sentiment=0.1, inst_flow=0, vix=15, inflation=5, repo_rate=6)
        assert retail.shape == (3, 3)
        assert inst.shape == (3, 3)

    def test_nash_strategy_labels(self):
        from app.scoring.game_theory.nash_model import RETAIL_ACTIONS, INST_ACTIONS
        assert len(RETAIL_ACTIONS) == 3
        assert len(INST_ACTIONS) == 3
        assert "Buy" in RETAIL_ACTIONS

    def test_nash_uses_retail_inst(self):
        from app.scoring.game_theory.nash_model import nash_equilibrium_signal
        result = nash_equilibrium_signal(*_default_payoffs())
        assert "equilibrium_found" in result


class TestQRE:
    def test_qre_signal_returns_keys(self):
        from app.scoring.game_theory.qre import compute_qre_signal
        result = compute_qre_signal(*_default_payoffs())
        assert "lambda_estimate" in result
        assert "rationality_label" in result
        assert "entropy" in result
        assert result["rationality_label"] in ("RANDOM", "BOUNDED", "RATIONAL", "NEAR_NASH")

    def test_qre_lambda_nonnegative(self):
        from app.scoring.game_theory.qre import compute_qre_signal
        result = compute_qre_signal(*_default_payoffs())
        assert result["lambda_estimate"] >= 0

    def test_qre_entropy_bounds(self):
        from app.scoring.game_theory.qre import compute_qre_signal
        result = compute_qre_signal(*_default_payoffs())
        assert 0.0 <= result["entropy"] <= 2.0

    def test_qre_deterministic(self):
        from app.scoring.game_theory.qre import compute_qre_signal
        r1 = compute_qre_signal(*_default_payoffs())
        r2 = compute_qre_signal(*_default_payoffs())
        assert approx(r1["lambda_estimate"]) == approx(r2["lambda_estimate"])


class TestEvolution:
    def test_replicator_dynamics_returns_valid(self):
        from app.scoring.game_theory.evolution import replicator_dynamics
        x0 = np.array([0.25, 0.25, 0.25, 0.25])
        fitness = np.array([0.5, 0.6, 0.4, 0.3])
        result = replicator_dynamics(x0, fitness, steps=50)
        assert len(result) == 4
        assert abs(sum(result) - 1.0) < 0.01
        assert all(r >= -0.01 for r in result)

    def test_replicator_dynamics_convergence(self):
        from app.scoring.game_theory.evolution import replicator_dynamics
        x0 = np.array([0.25, 0.25, 0.25, 0.25])
        fitness = np.array([1.0, 0.5, 0.3, 0.2])
        result = replicator_dynamics(x0, fitness, steps=200)
        assert result[0] > 0.4

    def test_compute_evolutionary_signal(self):
        from app.scoring.game_theory.evolution import compute_evolutionary_signal, evolve_allocations
        evolved = {"gold": 0.4, "silver": 0.3, "nifty": 0.2, "real_estate": 0.1}
        signal = compute_evolutionary_signal(evolved)
        assert "concentration" in signal
        assert "entropy" in signal
        assert "dominant_strategy" in signal
        assert 0 <= signal["concentration"] <= 1
        assert signal["entropy"] >= 0

    def test_evolve_allocations_shape(self):
        from app.scoring.game_theory.evolution import evolve_allocations
        breakdown = {"inflation": 5, "usd_inr": 2, "monetary_policy": -3, "fear_index": 0, "institutional_buying": 1, "crowd_hype": -2}
        result = evolve_allocations("gold", breakdown, {})
        assert len(result) == 4
        for strat_name in result:
            assert 0 <= result[strat_name] <= 1

    def test_evolve_allocations_sums_to_one(self):
        from app.scoring.game_theory.evolution import evolve_allocations
        breakdown = {"inflation": 5, "usd_inr": 2, "monetary_policy": -3, "fear_index": 0, "institutional_buying": 1, "crowd_hype": -2}
        result = evolve_allocations("gold", breakdown, {})
        assert abs(sum(result.values()) - 1.0) < 0.01

    def test_evolve_returns_strategy_keys(self):
        from app.scoring.game_theory.evolution import evolve_allocations
        breakdown = {"inflation": 5, "usd_inr": 2, "monetary_policy": -3, "fear_index": 0, "institutional_buying": 1, "crowd_hype": -2}
        result = evolve_allocations("gold", breakdown, {})
        assert "Momentum" in result
        assert "MeanReversion" in result
        assert "InflationHedge" in result
        assert "SafeHaven" in result
        assert len(result) == 4


class TestRegime:
    def test_regime_detector_initializes(self):
        from app.scoring.game_theory.regime import get_regime_detector
        detector = get_regime_detector()
        assert detector is not None
        assert hasattr(detector, "_model")
        assert len(detector.REGIME_LABELS) == 4

    def test_regime_detector_fit_and_predict(self, db_session):
        from app.scoring.game_theory.regime import get_regime_detector
        detector = get_regime_detector()
        detector.fit(db_session)
        idx, label = detector.predict(db_session)
        assert label in ("RISK_ON", "RISK_OFF", "CRISIS", "TRANSITION")

    def test_regime_predict_no_data(self, db_session):
        from app.scoring.game_theory.regime import get_regime_detector
        detector = get_regime_detector()
        idx, label = detector.predict(db_session)
        assert idx == 0
        assert label == "RISK_ON"

    def test_regime_factor_modulator(self):
        from app.scoring.game_theory.regime import get_regime_detector
        detector = get_regime_detector()
        mod = detector.regime_to_factor_modulator(0)
        assert isinstance(mod, dict)
        for k in ("inflation_factor", "currency_factor", "monetary_factor", "vix_factor", "inst_factor", "sentiment_factor"):
            assert k in mod
            assert isinstance(mod[k], float)

    def test_regime_modulator_unknown_index_falls_back(self):
        from app.scoring.game_theory.regime import get_regime_detector
        detector = get_regime_detector()
        mod = detector.regime_to_factor_modulator(99)
        assert isinstance(mod, dict)
        assert "inflation_factor" in mod


class TestPotential:
    def test_potential_optimizer_sums_to_one(self):
        from app.scoring.game_theory.potential import optimize_potential_game_allocation
        scores = {"gold": 60.0, "silver": 50.0, "nifty": 40.0, "real_estate": 55.0}
        weights = optimize_potential_game_allocation(scores)
        assert abs(sum(weights.values()) - 1.0) < 0.01

    def test_potential_all_assets_returned(self):
        from app.scoring.game_theory.potential import optimize_potential_game_allocation
        scores = {"gold": 60.0, "silver": 50.0, "nifty": 40.0, "real_estate": 55.0}
        weights = optimize_potential_game_allocation(scores)
        assert set(weights.keys()) == {"gold", "silver", "nifty", "real_estate"}

    def test_potential_bounds_zero_to_one(self):
        from app.scoring.game_theory.potential import optimize_potential_game_allocation
        scores = {"gold": 60.0, "silver": 50.0, "nifty": 40.0, "real_estate": 55.0}
        weights = optimize_potential_game_allocation(scores)
        for w in weights.values():
            assert 0.0 <= w <= 1.0

    def test_potential_different_risk_aversion(self):
        from app.scoring.game_theory.potential import optimize_potential_game_allocation
        scores = {"gold": 60.0, "silver": 50.0, "nifty": 40.0, "real_estate": 55.0}
        low_risk = optimize_potential_game_allocation(scores, risk_aversion=1.0)
        high_risk = optimize_potential_game_allocation(scores, risk_aversion=5.0)
        assert any(
            abs(low_risk[k] - high_risk[k]) > 0.001 for k in scores
        )

    def test_potential_equal_scores(self):
        from app.scoring.game_theory.potential import optimize_potential_game_allocation
        scores = {"gold": 50.0, "silver": 50.0, "nifty": 50.0, "real_estate": 50.0}
        weights = optimize_potential_game_allocation(scores)
        for w in weights.values():
            assert abs(w - 0.25) < 0.01


class TestGameTheoryAPI:
    def test_game_theory_latest_endpoint(self, client):
        resp = client.get("/game-theory/latest")
        assert resp.status_code == 200
        data = resp.json()
        assert "nash" in data
        assert "regime" in data
        assert "strategies" in data

    def test_game_theory_regime_endpoint(self, client):
        resp = client.get("/game-theory/regime")
        assert resp.status_code == 200
        data = resp.json()
        assert "regime_index" in data

    def test_game_theory_portfolio_endpoint(self, client):
        resp = client.get("/game-theory/portfolio?risk_aversion=2.0")
        assert resp.status_code == 200
        data = resp.json()
        assert "weights" in data
        assert "risk_aversion" in data
        assert len(data["weights"]) == 4

    def test_game_theory_nash_endpoint(self, client):
        resp = client.get("/game-theory/nash?limit=5")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestScoringIntegration:
    def test_scoring_engine_includes_game_factors(self, db_session, seed_neutral):
        from app.scoring.engine import calculate_scores
        from app.database.models import InvestmentScore
        from app.core.config import GT_NASH_ENABLED, GT_QRE_ENABLED, GT_EVOLUTION_ENABLED, GT_REGIME_ENABLED
        calculate_scores(db_session)
        records = db_session.query(InvestmentScore).all()
        assert len(records) == 4
        for r in records:
            d = r.details
            if GT_NASH_ENABLED:
                assert "nash_distance" in d
                assert isinstance(d["nash_distance"], (int, float))
            if GT_QRE_ENABLED:
                assert "rationality" in d
                assert isinstance(d["rationality"], (int, float))
            if GT_EVOLUTION_ENABLED:
                assert "evolution" in d
            if GT_REGIME_ENABLED:
                assert "regime_mod" in d

    def test_scoring_score_in_acceptable_range(self, db_session, seed_neutral):
        from app.scoring.engine import calculate_scores
        from app.database.models import InvestmentScore
        calculate_scores(db_session)
        records = db_session.query(InvestmentScore).all()
        for r in records:
            assert 0 <= r.total_score <= 100, f"{r.asset} score {r.total_score} out of range"
