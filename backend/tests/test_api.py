from datetime import datetime, timezone, timedelta
from app.database.models import InvestmentScore, MarketPrice, MacroIndicator, SentimentScore
from app.core.config import ASSETS_SCORED


def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert "version" in data


def test_health_endpoint(client, db_session, seed_neutral):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "categories" in data
    assert "scores" in data["categories"]
    assert "market_prices" in data["categories"]
    assert "macro_indicators" in data["categories"]


def test_scores_latest_with_data(client, db_session, seed_neutral):
    from app.scoring.engine import calculate_scores
    calculate_scores(db_session)
    resp = client.get("/scores/latest")
    assert resp.status_code == 200
    data = resp.json()
    for asset in ASSETS_SCORED:
        assert asset in data
        assert "score" in data[asset]
        assert "recommendation" in data[asset]
        assert "details" in data[asset]
        assert data[asset]["score"] is not None
    assert "_staleness" in data


def test_scores_latest_empty(client, db_session):
    resp = client.get("/scores/latest")
    assert resp.status_code == 200
    data = resp.json()
    for asset in ASSETS_SCORED:
        assert data[asset]["score"] == 50.0
        assert data[asset]["recommendation"] == "HOLD"


def test_scores_history(client, db_session, seed_neutral):
    from app.scoring.engine import calculate_scores
    now = datetime.now(timezone.utc)
    for days_ago in [0, 1, 2]:
        calculate_scores(db_session)
    resp = client.get("/scores/history?asset=gold&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for entry in data:
        assert "timestamp" in entry
        assert "score" in entry
        assert "recommendation" in entry


def test_scores_history_no_data(client, db_session):
    resp = client.get("/scores/history?asset=gold&limit=5")
    assert resp.status_code == 200
    assert resp.json() == []


def test_market_latest_with_data(client, db_session, seed_neutral):
    resp = client.get("/market/latest")
    assert resp.status_code == 200
    data = resp.json()
    for key in ("gold", "silver", "nifty", "real_estate", "usd_inr", "india_vix",
                 "repo_rate", "inflation", "fii_net_flow", "dii_net_flow"):
        assert key in data, f"Missing key: {key}"
    assert "_staleness" in data


def test_market_latest_fallback(client, db_session):
    resp = client.get("/market/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["gold"]["price"] > 0
    assert data["silver"]["currency"] == "USD"


def test_sentiment_news_empty(client, db_session):
    resp = client.get("/sentiment/news?limit=5")
    assert resp.status_code == 200
    assert resp.json() == []


def test_sentiment_news_with_data(client, db_session, seed_neutral):
    resp = client.get("/sentiment/news?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    for entry in data:
        assert "headline" in entry
        assert "sentiment" in entry
        assert "asset" in entry


def test_health_degraded_when_stale(client, db_session):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("healthy", "degraded")


def test_scores_latest_structure(client, db_session, seed_neutral):
    from app.scoring.engine import calculate_scores
    calculate_scores(db_session)
    resp = client.get("/scores/latest")
    gold = resp.json()["gold"]
    assert set(gold.keys()) == {"asset", "score", "recommendation", "details", "timestamp"}
    required = {"base_score", "inflation", "usd_inr", "monetary_policy",
                   "fear_index", "institutional_buying", "crowd_hype"}
    assert required.issubset(set(gold["details"].keys()))
