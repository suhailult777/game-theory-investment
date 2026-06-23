from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from pytrends.request import TrendReq
from app.database.models import GoogleTrendScore
from app.core.log import get_logger

log = get_logger(__name__)

ASSET_KEYWORDS = {
    "gold": "gold price india",
    "silver": "silver price india",
    "nifty": "nifty 50 today",
    "real_estate": "real estate india",
}

_pytrends = None


def get_pytrends():
    global _pytrends
    if _pytrends is None:
        _pytrends = TrendReq(hl="en-IN", tz=330, requests_args={"timeout": 15})
    return _pytrends


def fetch_google_trends(asset: str, keyword: str) -> dict | None:
    try:
        pytrends = get_pytrends()
        pytrends.build_payload([keyword], timeframe="now 7-d", geo="IN")
        data = pytrends.interest_over_time()
        if data.empty or keyword not in data.columns:
            return None
        values = data[keyword].dropna().tolist()
        if not values:
            return None
        current = float(values[-1])
        week_ago = float(values[0])
        change = (
            round(((current - week_ago) / max(week_ago, 1)) * 100, 1)
            if week_ago > 0
            else 0.0
        )
        return {"search_interest": round(current, 1), "trend_change_7d": change}
    except Exception as e:
        log.warning("Google Trends fetch failed for %s: %s", asset, e)
        return None


def run_trends_collection(db: Session):
    log.info("Starting Google Trends data collection...")
    for asset, keyword in ASSET_KEYWORDS.items():
        result = fetch_google_trends(asset, keyword)
        if result is None:
            log.warning("No trends data for %s", asset)
            continue
        record = GoogleTrendScore(
            timestamp=datetime.now(timezone.utc),
            asset=asset,
            keyword=keyword,
            search_interest=result["search_interest"],
            trend_change_7d=result["trend_change_7d"],
            source="Google Trends",
        )
        db.add(record)
        log.info("Trends for %s: interest=%.1f, 7d change=%.1f%%", asset, result["search_interest"], result["trend_change_7d"])
    try:
        db.commit()
        log.info("Google Trends data committed to database.")
    except Exception as e:
        db.rollback()
        log.error("DB commit error in trends collector: %s", e)
