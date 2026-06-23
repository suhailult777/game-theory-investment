import pytest
from datetime import datetime, timezone
from app.database.models import GoogleTrendScore, InvestmentScore
from app.core.config import TRENDS_SURGE_THRESHOLD, GT_TRENDS_WEIGHT


class TestTrendsModel:
    def test_create_trend_record(self, db_session):
        record = GoogleTrendScore(
            asset="gold",
            keyword="gold price india",
            search_interest=50.0,
            trend_change_7d=15.0,
            source="Google Trends",
        )
        db_session.add(record)
        db_session.commit()
        saved = db_session.query(GoogleTrendScore).first()
        assert saved.asset == "gold"
        assert saved.search_interest == 50.0
        assert saved.trend_change_7d == 15.0

    def test_trend_without_change(self, db_session):
        record = GoogleTrendScore(
            asset="nifty",
            keyword="nifty 50 today",
            search_interest=72.3,
            trend_change_7d=None,
            source="Google Trends",
        )
        db_session.add(record)
        db_session.commit()
        saved = db_session.query(GoogleTrendScore).first()
        assert saved.trend_change_7d is None


class TestTrendsCollector:
    def test_fetch_google_trends_returns_dict_or_none(self):
        from app.collectors.trends_collector import fetch_google_trends
        result = fetch_google_trends("gold", "gold price india")
        if result is not None:
            assert "search_interest" in result
            assert "trend_change_7d" in result
            assert 0 <= result["search_interest"] <= 100

    def test_fetch_unknown_asset_returns_none(self):
        from app.collectors.trends_collector import fetch_google_trends
        result = fetch_google_trends("nonexistent_asset", "zzzzinvalidkeyword999")
        assert result is None


class TestTrendsFactor:
    def _seed_trend(self, db_session, asset, change):
        record = GoogleTrendScore(
            asset=asset,
            keyword="test keyword",
            search_interest=50.0,
            trend_change_7d=change,
            source="test",
        )
        db_session.add(record)
        db_session.commit()

    def test_trend_surge_penalizes_score(self, db_session, seed_neutral):
        self._seed_trend(db_session, "gold", TRENDS_SURGE_THRESHOLD + 5)
        from app.scoring.engine import calculate_scores
        calculate_scores(db_session)
        record = db_session.query(InvestmentScore).filter(InvestmentScore.asset == "gold").first()
        assert record.details["google_trends"] == int(round(-GT_TRENDS_WEIGHT))

    def test_trend_plunge_boosts_score(self, db_session, seed_neutral):
        self._seed_trend(db_session, "gold", -(TRENDS_SURGE_THRESHOLD + 5))
        from app.scoring.engine import calculate_scores
        calculate_scores(db_session)
        record = db_session.query(InvestmentScore).filter(InvestmentScore.asset == "gold").first()
        assert record.details["google_trends"] == int(round(GT_TRENDS_WEIGHT))

    def test_neutral_trend_no_impact(self, db_session, seed_neutral):
        self._seed_trend(db_session, "gold", 0.0)
        from app.scoring.engine import calculate_scores
        calculate_scores(db_session)
        record = db_session.query(InvestmentScore).filter(InvestmentScore.asset == "gold").first()
        assert record.details["google_trends"] == 0

    def test_no_trend_data_no_impact(self, db_session, seed_neutral):
        from app.scoring.engine import calculate_scores
        calculate_scores(db_session)
        record = db_session.query(InvestmentScore).filter(InvestmentScore.asset == "gold").first()
        assert record.details["google_trends"] == 0


class TestTrendsAPI:
    def test_trends_latest_endpoint(self, client):
        resp = client.get("/trends/latest?limit=5")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_trends_endpoint_with_data(self, client, db_session):
        db_session.add(GoogleTrendScore(
            asset="gold", keyword="gold price",
            search_interest=65.0, trend_change_7d=10.0,
            source="test",
        ))
        db_session.commit()
        resp = client.get("/trends/latest")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["asset"] == "gold"
        assert data[0]["search_interest"] == 65.0
