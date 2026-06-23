from unittest.mock import patch, MagicMock, PropertyMock
from datetime import datetime, timezone
import pandas as pd
import json

from app.collectors.market_collector import fetch_and_store_market_data
from app.collectors.rbi_collector import fetch_and_store_rbi_data
from app.collectors.fii_dii_collector import fetch_and_store_fii_dii_data
from app.database.models import MarketPrice, MacroIndicator


class TestMarketCollector:
    @patch("yfinance.Ticker")
    def test_fetches_and_stores_all_assets(self, mock_ticker, db_session):
        prices = {"GC=F": 2400.0, "SI=F": 30.5, "^NSEI": 22500.0,
                  "^CNXREALTY": 500.0, "INR=X": 83.5, "^INDIAVIX": 16.0}

        def ticker_side_effect(ticker, session=None):
            instance = MagicMock()
            idx = pd.date_range("2025-01-01", periods=1)
            instance.history.return_value = pd.DataFrame(
                {"Close": [prices.get(ticker, 0.0)]}, index=idx
            )
            type(instance).fast_info = PropertyMock(return_value={"lastPrice": prices.get(ticker, 0.0)})
            return instance

        mock_ticker.side_effect = ticker_side_effect

        fetch_and_store_market_data(db_session)

        assets = {r.asset for r in db_session.query(MarketPrice).all()}
        assert assets == {"gold", "silver", "nifty", "real_estate", "usd_inr", "india_vix"}
        gold = db_session.query(MarketPrice).filter(MarketPrice.asset == "gold").first()
        assert float(gold.price) == 2400.0
        assert gold.currency == "USD"

    @patch("yfinance.Ticker")
    def test_fallback_on_failure(self, mock_ticker, db_session):
        db_session.add(MarketPrice(
            timestamp=datetime.now(timezone.utc), asset="gold",
            price=2300.0, currency="USD", source="previous",
        ))
        db_session.commit()
        mock_instance = MagicMock()
        mock_instance.history.side_effect = Exception("YF down")
        type(mock_instance).fast_info = PropertyMock(return_value=MagicMock())
        mock_instance.fast_info.__getitem__.side_effect = Exception("fast_info down")
        mock_ticker.return_value = mock_instance

        fetch_and_store_market_data(db_session)

        gold = db_session.query(MarketPrice).filter(MarketPrice.asset == "gold").order_by(
            MarketPrice.timestamp.desc()
        ).first()
        assert float(gold.price) == 2300.0
        assert gold.source == "Stale cache"

    @patch("yfinance.Ticker")
    def test_empty_history_triggers_fastinfo(self, mock_ticker, db_session):
        mock_instance = MagicMock()
        mock_instance.history.return_value = pd.DataFrame()
        type(mock_instance).fast_info = PropertyMock(return_value={"lastPrice": 2420.0})
        mock_ticker.return_value = mock_instance

        fetch_and_store_market_data(db_session)

        gold = db_session.query(MarketPrice).filter(MarketPrice.asset == "gold").first()
        assert float(gold.price) == 2420.0


class TestRBICollector:
    @patch("app.collectors.rbi_collector.requests.get")
    def test_scrapes_and_stores_macro_data(self, mock_get, db_session):
        mock_response = MagicMock()
        mock_response.text = """
        <html>
        <body>
            Repo Rate : 6.25%<br>
            Inflation (CPI) : 4.8%<br>
        </body>
        </html>
        """
        mock_get.return_value = mock_response

        fetch_and_store_rbi_data(db_session)

        repo = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "repo_rate"
        ).first()
        assert repo is not None
        assert float(repo.value) == 6.25

        infl = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "inflation"
        ).first()
        assert infl is not None
        assert float(infl.value) == 4.8

    @patch("app.collectors.rbi_collector.requests.get")
    def test_fallback_when_scrape_fails(self, mock_get, db_session):
        db_session.add(MacroIndicator(
            timestamp=datetime.now(timezone.utc), indicator="repo_rate",
            value=6.50, source="previous",
        ))
        db_session.add(MacroIndicator(
            timestamp=datetime.now(timezone.utc), indicator="inflation",
            value=5.10, source="previous",
        ))
        db_session.commit()

        mock_get.side_effect = Exception("Network error")
        fetch_and_store_rbi_data(db_session)

        repo = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "repo_rate"
        ).order_by(MacroIndicator.timestamp.desc()).first()
        assert float(repo.value) == 6.50


class TestFIIDIICollector:
    @patch("app.collectors.fii_dii_collector.requests.get")
    def test_scrapes_and_stores_flow_data(self, mock_get, db_session):
        next_data = {
            "props": {
                "pageProps": {
                    "FiiDiiData": {
                        "fiiDiiData": [
                            {
                                "fiiCM": "1,234.56",
                                "diiCM": "789.12",
                                "date": "2025-01-15",
                            }
                        ]
                    }
                }
            }
        }
        mock_response = MagicMock()
        mock_response.text = f'<html><script id="__NEXT_DATA__" type="application/json">{json.dumps(next_data)}</script></html>'
        mock_get.return_value = mock_response

        fetch_and_store_fii_dii_data(db_session)

        fii = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "fii_net_flow"
        ).first()
        assert fii is not None
        assert float(fii.value) == 1234.56

        dii = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "dii_net_flow"
        ).first()
        assert dii is not None
        assert float(dii.value) == 789.12

    @patch("app.collectors.fii_dii_collector.requests.get")
    def test_fallback_when_scrape_fails(self, mock_get, db_session):
        db_session.add(MacroIndicator(
            timestamp=datetime.now(timezone.utc), indicator="fii_net_flow",
            value=500.0, source="previous",
        ))
        db_session.add(MacroIndicator(
            timestamp=datetime.now(timezone.utc), indicator="dii_net_flow",
            value=-200.0, source="previous",
        ))
        db_session.commit()

        mock_get.side_effect = Exception("Network error")
        fetch_and_store_fii_dii_data(db_session)

        fii = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "fii_net_flow"
        ).order_by(MacroIndicator.timestamp.desc()).first()
        assert float(fii.value) == 500.0

        dii = db_session.query(MacroIndicator).filter(
            MacroIndicator.indicator == "dii_net_flow"
        ).order_by(MacroIndicator.timestamp.desc()).first()
        assert float(dii.value) == -200.0
