import pytest
from datetime import datetime, timezone, timedelta
from app.scoring.engine import calculate_scores
from app.database.models import InvestmentScore, MarketPrice, MacroIndicator, SentimentScore
from app.core.config import (
    INFLATION_THRESHOLD, REPO_TIGHT, REPO_ACCOMMODATIVE,
    VIX_PANIC, VIX_COMPLACENCY, INST_STRONG_BUY, INST_STRONG_SELL,
    SENT_EUPHORIA, SENT_PANIC,
)
from tests.helpers import add_macro


@pytest.fixture
def _patch_gt_config(monkeypatch):
    monkeypatch.setattr("app.scoring.engine.GT_REGIME_ENABLED", False)
    monkeypatch.setattr("app.scoring.engine.GT_NASH_ENABLED", False)
    monkeypatch.setattr("app.scoring.engine.GT_QRE_ENABLED", False)
    monkeypatch.setattr("app.scoring.engine.GT_EVOLUTION_ENABLED", False)


@pytest.mark.usefixtures("_patch_gt_config")
class TestBaseScore:
    def test_base_score_is_50(self, db_session, seed_neutral):
        calculate_scores(db_session)
        records = db_session.query(InvestmentScore).all()
        assert len(records) == 4
        for r in records:
            assert r.details["base_score"] == 50

    def test_score_clamped_min_0(self, db_session, seed_neutral):
        add_macro(db_session, "inflation", 3.0)
        add_macro(db_session, "repo_rate", 3.0)
        add_macro(db_session, "fii_net_flow", -5000.0)
        add_macro(db_session, "dii_net_flow", -5000.0)
        db_session.commit()
        for asset in ("gold", "silver", "nifty", "real_estate"):
            for i in range(3):
                db_session.add(SentimentScore(
                    timestamp=datetime.now(timezone.utc) - timedelta(hours=i * 4),
                    asset=asset, sentiment=0.8,
                    headline=f"euphoric {asset} {i}", source="test",
                ))
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.total_score >= 0

    def test_score_clamped_max_100(self, db_session, seed_neutral):
        add_macro(db_session, "inflation", 12.0)
        add_macro(db_session, "fii_net_flow", 5000.0)
        add_macro(db_session, "dii_net_flow", 5000.0)
        db_session.commit()
        usd_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "india_vix").first()
        usd_row.price = 35.0
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.total_score <= 100

    def test_all_four_assets_scored(self, db_session, seed_neutral):
        calculate_scores(db_session)
        assets = {r.asset for r in db_session.query(InvestmentScore).all()}
        assert assets == {"gold", "silver", "nifty", "real_estate"}

    def test_recommendation_mapping(self, db_session, seed_neutral):
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.total_score >= 70:
                assert r.recommendation == "STRONG BUY"
            elif r.total_score >= 50:
                assert r.recommendation == "ACCUMULATE"
            elif r.total_score >= 30:
                assert r.recommendation == "HOLD"
            else:
                assert r.recommendation == "AVOID"


@pytest.mark.usefixtures("_patch_gt_config")
class TestFactorA_Inflation:
    def test_high_inflation_boosts_gold_silver_realestate(self, db_session, seed_neutral):
        add_macro(db_session, "inflation", INFLATION_THRESHOLD + 1.0)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver", "real_estate"):
                assert r.details["inflation"] == 10
            elif r.asset == "nifty":
                assert r.details["inflation"] == -5

    def test_low_inflation_boosts_nifty(self, db_session, seed_neutral):
        add_macro(db_session, "inflation", INFLATION_THRESHOLD - 1.0)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver", "real_estate"):
                assert r.details["inflation"] == 0
            elif r.asset == "nifty":
                assert r.details["inflation"] == 5

    def test_inflation_at_threshold_is_low(self, db_session, seed_neutral):
        add_macro(db_session, "inflation", INFLATION_THRESHOLD)
        db_session.commit()
        calculate_scores(db_session)
        r = db_session.query(InvestmentScore).filter(InvestmentScore.asset == "gold").first()
        assert r.details["inflation"] == 0


@pytest.mark.usefixtures("_patch_gt_config")
class TestFactorB_CurrencyStress:
    def test_inr_above_threshold_boosts_gold_silver(self, db_session, seed_neutral):
        usd_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "usd_inr").first()
        usd_row.price = 95.0
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver"):
                assert r.details["usd_inr"] == 10
            elif r.asset == "nifty":
                assert r.details["usd_inr"] == -5
            else:
                assert r.details["usd_inr"] == 0

    def test_inr_below_threshold_boosts_nifty(self, db_session, seed_neutral):
        from sqlalchemy import desc
        latest = db_session.query(MarketPrice).filter(
            MarketPrice.asset == "usd_inr"
        ).order_by(desc(MarketPrice.timestamp)).first()
        latest.price = 75.0
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset == "nifty":
                assert r.details["usd_inr"] == 5, f"Expected 5 for {r.asset}, got {r.details['usd_inr']}"
            else:
                assert r.details["usd_inr"] == 0, f"Expected 0 for {r.asset}, got {r.details['usd_inr']}"


@pytest.mark.usefixtures("_patch_gt_config")
class TestFactorC_MonetaryPolicy:
    def test_tight_policy_benefits_gold_silver(self, db_session, seed_neutral):
        add_macro(db_session, "repo_rate", REPO_TIGHT + 0.5)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver"):
                assert r.details["monetary_policy"] == 5
            elif r.asset in ("nifty", "real_estate"):
                assert r.details["monetary_policy"] == -5

    def test_accommodative_policy_benefits_nifty_realestate(self, db_session, seed_neutral):
        add_macro(db_session, "repo_rate", REPO_ACCOMMODATIVE - 0.5)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver"):
                assert r.details["monetary_policy"] == -5
            elif r.asset in ("nifty", "real_estate"):
                assert r.details["monetary_policy"] == 5

    def test_neutral_rate_no_adjustment(self, db_session, seed_neutral):
        add_macro(db_session, "repo_rate", REPO_ACCOMMODATIVE + 0.25)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.details["monetary_policy"] == 0


@pytest.mark.usefixtures("_patch_gt_config")
class TestFactorD_VIX:
    def test_vix_panic_boosts_gold_nifty(self, db_session, seed_neutral):
        vix_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "india_vix").first()
        vix_row.price = VIX_PANIC + 5
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "nifty"):
                assert r.details["fear_index"] == 15
            else:
                assert r.details["fear_index"] == 0

    def test_vix_complacency_penalizes_nifty(self, db_session, seed_neutral):
        vix_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "india_vix").first()
        vix_row.price = VIX_COMPLACENCY - 2
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset == "nifty":
                assert r.details["fear_index"] == -10
            else:
                assert r.details["fear_index"] == 0

    def test_vix_mid_range_no_impact(self, db_session, seed_neutral):
        vix_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "india_vix").first()
        vix_row.price = 16.0
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.details["fear_index"] == 0


@pytest.mark.usefixtures("_patch_gt_config")
class TestFactorE_InstitutionalFlows:
    def test_strong_buy_plus_15(self, db_session, seed_neutral):
        add_macro(db_session, "fii_net_flow", INST_STRONG_BUY + 500)
        add_macro(db_session, "dii_net_flow", 0)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver", "nifty"):
                assert r.details["institutional_buying"] == 15

    def test_strong_sell_minus_10(self, db_session, seed_neutral):
        add_macro(db_session, "fii_net_flow", INST_STRONG_SELL - 500)
        add_macro(db_session, "dii_net_flow", 0)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver", "nifty"):
                assert r.details["institutional_buying"] == -10

    def test_mild_buy_plus_10(self, db_session, seed_neutral):
        add_macro(db_session, "fii_net_flow", 500)
        add_macro(db_session, "dii_net_flow", 200)
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            if r.asset in ("gold", "silver", "nifty"):
                assert r.details["institutional_buying"] == 10

    def test_realestate_separate_threshold(self, db_session, seed_neutral):
        add_macro(db_session, "fii_net_flow", 1500)
        add_macro(db_session, "dii_net_flow", 0)
        db_session.commit()
        calculate_scores(db_session)
        re = db_session.query(InvestmentScore).filter(InvestmentScore.asset == "real_estate").first()
        assert re.details["institutional_buying"] == 10


@pytest.mark.usefixtures("_patch_gt_config")
class TestFactorF_Sentiment:
    def test_euphoria_penalty(self, db_session, seed_neutral):
        db_session.query(SentimentScore).delete()
        for asset in ("gold", "silver", "nifty", "real_estate"):
            for i in range(3):
                db_session.add(SentimentScore(
                    timestamp=datetime.now(timezone.utc) - timedelta(hours=i * 4),
                    asset=asset, sentiment=SENT_EUPHORIA + 0.1,
                    headline=f"euphoric {asset} {i}", source="test",
                ))
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.details["crowd_hype"] == -10, f"{r.asset}: {r.details}"

    def test_panic_boost(self, db_session, seed_neutral):
        db_session.query(SentimentScore).delete()
        for asset in ("gold", "silver", "nifty", "real_estate"):
            for i in range(3):
                db_session.add(SentimentScore(
                    timestamp=datetime.now(timezone.utc) - timedelta(hours=i * 4),
                    asset=asset, sentiment=SENT_PANIC - 0.1,
                    headline=f"panic {asset} {i}", source="test",
                ))
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.details["crowd_hype"] == 10, f"{r.asset}: {r.details}"

    def test_neutral_sentiment_no_impact(self, db_session, seed_neutral):
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            assert r.details["crowd_hype"] == 0


class TestIntegration:
    def test_score_breakdown_sum_matches_total(self, db_session, seed_neutral):
        add_macro(db_session, "inflation", 7.0)
        add_macro(db_session, "repo_rate", REPO_TIGHT + 0.5)
        add_macro(db_session, "fii_net_flow", 2000)
        add_macro(db_session, "dii_net_flow", 1000)
        db_session.commit()
        usd_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "usd_inr").first()
        usd_row.price = 92.0
        vix_row = db_session.query(MarketPrice).filter(MarketPrice.asset == "india_vix").first()
        vix_row.price = VIX_PANIC + 3
        db_session.commit()
        calculate_scores(db_session)
        for r in db_session.query(InvestmentScore).all():
            breakdown_sum = sum(v for v in r.details.values())
            assert r.total_score == max(0, min(100, breakdown_sum))

    def test_database_persistence(self, db_session, seed_neutral):
        calculate_scores(db_session)
        records = db_session.query(InvestmentScore).all()
        assert len(records) == 4
        timestamps = {r.timestamp.replace(microsecond=0) for r in records}
        assert len(timestamps) >= 1
        for r in records:
            assert r.recommendation in ("STRONG BUY", "ACCUMULATE", "HOLD", "AVOID")
            assert isinstance(r.details, dict)
            required = {"base_score", "inflation", "usd_inr", "monetary_policy",
                           "fear_index", "institutional_buying", "crowd_hype"}
            assert required.issubset(set(r.details.keys()))
