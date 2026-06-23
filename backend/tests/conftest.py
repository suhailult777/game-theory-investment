import pytest
import os
import sys
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["LOG_LEVEL"] = "CRITICAL"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database.models import Base, MarketPrice, MacroIndicator, SentimentScore, InvestmentScore, DataQualityMetric, GoogleTrendScore
from app.database.models import EnsembleScore, ModelCorrelation, FictitiousPlayResult, FTPLResult, MeanFieldResult
from app.database.db import get_db
from app.main import app
from app.core.config import ASSETS_SCORED, ASSETS_MARKET
from tests.helpers import add_macro

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(setup_db):
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


BASE_PRICES = {
    "gold": 2400.0, "silver": 30.0, "nifty": 22500.0,
    "real_estate": 500.0, "usd_inr": 83.5, "india_vix": 15.0,
}
CURRENCIES = {
    "gold": "USD", "silver": "USD", "nifty": "INR",
    "real_estate": "INR", "usd_inr": "INR", "india_vix": "POINTS",
}


@pytest.fixture
def seed_neutral(db_session):
    """Seed data where all macro conditions are neutral — everything at threshold boundary."""
    now = datetime.now(timezone.utc)

    for i in range(90):
        day = now - timedelta(days=i + 1)
        db_session.add(MarketPrice(
            timestamp=day, asset="usd_inr", price=83.0,
            currency="INR", source="test",
        ))

    for asset in ASSETS_MARKET:
        db_session.add(MarketPrice(
            timestamp=now, asset=asset, price=BASE_PRICES[asset],
            currency=CURRENCIES[asset], source="test",
        ))

    db_session.add(MacroIndicator(timestamp=now, indicator="inflation", value=5.0, source="test"))
    db_session.add(MacroIndicator(timestamp=now, indicator="repo_rate", value=5.5, source="test"))
    db_session.add(MacroIndicator(timestamp=now, indicator="fii_net_flow", value=500.0, source="test"))
    db_session.add(MacroIndicator(timestamp=now, indicator="dii_net_flow", value=200.0, source="test"))

    for asset in ASSETS_SCORED:
        for i in range(3):
            db_session.add(SentimentScore(
                timestamp=now - timedelta(hours=i * 4),
                asset=asset, sentiment=0.0,
                headline=f"neutral {asset} news {i}", source="test",
            ))

    db_session.commit()
    return now


@pytest.fixture
def db_session_allows_commit(setup_db):
    """Session that permits commits — for tests that call commit() internally."""
    connection = engine.connect()
    session = TestSession(bind=connection)
    session.query(DataQualityMetric).delete()
    session.commit()
    yield session
    session.rollback()
    session.close()
    connection.close()
