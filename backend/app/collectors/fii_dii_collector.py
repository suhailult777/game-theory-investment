import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import MacroIndicator
from app.core.retry import with_retries, get_last_known
from app.core.log import get_logger

log = get_logger(__name__)


def _scrape_moneycontrol_page():
    url = "https://www.moneycontrol.com/stocks/marketstats/fii_dii_activity/index.php"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    next_data = soup.find("script", id="__NEXT_DATA__")
    if next_data:
        data_json = json.loads(next_data.string)
        page_props = data_json.get("props", {}).get("pageProps", {})
        fii_dii_data = page_props.get("FiiDiiData", {})
        fii_dii_table = fii_dii_data.get("fiiDiiData", [])
        if fii_dii_table:
            latest_item = fii_dii_table[0]
            fii_raw = latest_item.get("fiiCM", "0").replace(",", "")
            dii_raw = latest_item.get("diiCM", "0").replace(",", "")
            fii_flow = float(fii_raw)
            dii_flow = float(dii_raw)
            log.info("Scraped FII: %s Cr, DII: %s Cr (Date: %s)", fii_flow, dii_flow, latest_item.get("date"))
            return fii_flow, dii_flow

    raise ValueError("Could not parse FII/DII data from Moneycontrol page")


@with_retries(max_attempts=3, delay=1.0, backoff=2.0, exceptions=(requests.RequestException, ValueError))
def _scrape_with_retries():
    return _scrape_moneycontrol_page()


def fetch_and_store_fii_dii_data(db: Session):
    log.info("Starting FII/DII flow data collection...")

    fii_flow = None
    dii_flow = None
    scraped = False

    try:
        fii_flow, dii_flow = _scrape_with_retries()
        scraped = True
    except Exception as e:
        log.error("All FII/DII scrape attempts failed: %s", e)

    if fii_flow is None:
        fii_flow = get_last_known(db, MacroIndicator, MacroIndicator.indicator, "fii_net_flow") or 0.0
        log.warning("Falling back to cached fii_net_flow: %s", fii_flow)
    if dii_flow is None:
        dii_flow = get_last_known(db, MacroIndicator, MacroIndicator.indicator, "dii_net_flow") or 0.0
        log.warning("Falling back to cached dii_net_flow: %s", dii_flow)

    try:
        db.add(
            MacroIndicator(
                timestamp=datetime.now(timezone.utc),
                indicator="fii_net_flow",
                value=fii_flow,
                source="Moneycontrol Scraper" if scraped else "Cache fallback",
            )
        )
        db.add(
            MacroIndicator(
                timestamp=datetime.now(timezone.utc),
                indicator="dii_net_flow",
                value=dii_flow,
                source="Moneycontrol Scraper" if scraped else "Cache fallback",
            )
        )
        db.commit()
        log.info("Stored FII/DII: FII=%s Cr, DII=%s Cr", fii_flow, dii_flow)
    except Exception as e:
        db.rollback()
        log.error("DB commit error in FII/DII collector: %s", e)
