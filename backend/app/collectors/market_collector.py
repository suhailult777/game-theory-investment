import yfinance as yf
import requests
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.models import MarketPrice
from app.core.retry import with_retries
from app.core.config import YF_TICKERS, YF_CURRENCIES
from app.core.log import get_logger

log = get_logger(__name__)


def _fetch_price(ticker: str, session: requests.Session):
    ticker_obj = yf.Ticker(ticker, session=session)
    hist = ticker_obj.history(period="1d")
    if not hist.empty:
        return float(hist.iloc[-1]["Close"]), "Yahoo Finance"
    price = float(ticker_obj.fast_info["lastPrice"])
    return price, "Yahoo Finance (FastInfo)"


@with_retries(max_attempts=3, delay=1.0, backoff=2.0)
def _fetch_price_with_retries(ticker: str, session: requests.Session):
    return _fetch_price(ticker, session)


def _get_last_known_price(db: Session, asset: str):
    record = (
        db.query(MarketPrice)
        .filter(MarketPrice.asset == asset)
        .order_by(desc(MarketPrice.timestamp))
        .first()
    )
    return float(record.price) if record else None


def fetch_and_store_market_data(db: Session):
    log.info("Starting market price collection...")

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
        }
    )

    for asset, ticker in YF_TICKERS.items():
        currency = YF_CURRENCIES.get(asset, "POINTS")
        try:
            price, source = _fetch_price_with_retries(ticker, session)
            db.add(
                MarketPrice(
                    timestamp=datetime.now(timezone.utc),
                    asset=asset,
                    price=price,
                    currency=currency,
                    source=source,
                )
            )
            log.info("Collected %s (%s): %s %s", asset, ticker, price, currency)
        except Exception as e:
            fallback = _get_last_known_price(db, asset)
            if fallback is not None:
                db.add(
                    MarketPrice(
                        timestamp=datetime.now(timezone.utc),
                        asset=asset,
                        price=fallback,
                        currency=currency,
                        source="Stale cache",
                    )
                )
                log.warning("Using cached price %s for %s after failure: %s", fallback, asset, e)
            else:
                log.error("No data and no cache for %s (%s): %s", asset, ticker, e)

    try:
        db.commit()
        log.info("Market price collection complete.")
    except Exception as e:
        db.rollback()
        log.error("DB commit error in market collector: %s", e)
