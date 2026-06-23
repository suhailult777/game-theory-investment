import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import MacroIndicator
from app.core.retry import with_retries, get_last_known
from app.core.log import get_logger

log = get_logger(__name__)


def _scrape_rbi_page():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get("https://www.rbi.org.in/", headers=headers, timeout=12)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    text_content = soup.get_text()

    repo_rate = None
    inflation_rate = None

    repo_match = re.search(r"Repo\s+Rate\s*:\s*([\d\.]+)\s*%", text_content, re.IGNORECASE)
    if repo_match:
        repo_rate = float(repo_match.group(1))
        log.info("Scraped Repo Rate (text): %s%%", repo_rate)
    else:
        for td in soup.find_all(["td", "th"]):
            if "repo rate" in td.text.lower():
                sibling = td.find_next_sibling("td")
                if sibling:
                    num_match = re.search(r"([\d\.]+)", sibling.text)
                    if num_match:
                        repo_rate = float(num_match.group(1))
                        log.info("Scraped Repo Rate (table): %s%%", repo_rate)
                        break

    inflation_match = re.search(r"Inflation\s*\(CPI\)\s*:\s*([\d\.]+)\s*%", text_content, re.IGNORECASE)
    if inflation_match:
        inflation_rate = float(inflation_match.group(1))
        log.info("Scraped CPI Inflation (text): %s%%", inflation_rate)
    else:
        for td in soup.find_all(["td", "th"]):
            if "inflation" in td.text.lower() and "cpi" in td.text.lower():
                sibling = td.find_next_sibling("td")
                if sibling:
                    num_match = re.search(r"([\d\.]+)", sibling.text)
                    if num_match:
                        inflation_rate = float(num_match.group(1))
                        log.info("Scraped CPI Inflation (table): %s%%", inflation_rate)
                        break

    return repo_rate, inflation_rate


@with_retries(max_attempts=3, delay=1.0, backoff=2.0, exceptions=(requests.RequestException,))
def _scrape_with_retries():
    return _scrape_rbi_page()


def fetch_and_store_rbi_data(db: Session):
    log.info("Starting RBI macro data collection...")

    repo_rate = None
    inflation_rate = None
    scraped = False

    try:
        repo_rate, inflation_rate = _scrape_with_retries()
        scraped = True
    except Exception as e:
        log.error("All RBI scrape attempts failed: %s", e)

    if repo_rate is None:
        repo_rate = get_last_known(db, MacroIndicator, MacroIndicator.indicator, "repo_rate")
        log.warning("Falling back to cached repo_rate: %s", repo_rate)
    if inflation_rate is None:
        inflation_rate = get_last_known(db, MacroIndicator, MacroIndicator.indicator, "inflation")
        log.warning("Falling back to cached inflation: %s", inflation_rate)
    if repo_rate is None:
        repo_rate = 6.50
        log.warning("Using hard default repo_rate: %s", repo_rate)
    if inflation_rate is None:
        inflation_rate = 5.10
        log.warning("Using hard default inflation: %s", inflation_rate)

    try:
        db.add(
            MacroIndicator(
                timestamp=datetime.now(timezone.utc),
                indicator="repo_rate",
                value=repo_rate,
                source="RBI Website Scraper" if scraped else "Cache fallback",
            )
        )
        db.add(
            MacroIndicator(
                timestamp=datetime.now(timezone.utc),
                indicator="inflation",
                value=inflation_rate,
                source="RBI Website Scraper" if scraped else "Cache fallback",
            )
        )
        db.commit()
        log.info("Stored macro: Repo Rate=%s%%, Inflation=%s%%", repo_rate, inflation_rate)
    except Exception as e:
        db.rollback()
        log.error("DB commit error in rbi collector: %s", e)
