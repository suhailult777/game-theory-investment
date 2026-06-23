import xml.etree.ElementTree as ET
import requests
from datetime import datetime, timezone
import urllib.parse
from sqlalchemy.orm import Session
from app.database.models import SentimentScore
from app.core.log import get_logger
from transformers import pipeline

log = get_logger(__name__)

_classifier = None


def get_classifier():
    global _classifier
    if _classifier is None:
        log.info("Loading FinBERT sentiment analysis model (approx 260MB)...")
        _classifier = pipeline(
            "sentiment-analysis",
            model="yiyanghkust/finbert-tone",
            tokenizer="yiyanghkust/finbert-tone",
            device=-1,
        )
        log.info("FinBERT model loaded successfully.")
    return _classifier


QUERIES = {
    "gold": "gold price india investment",
    "silver": "silver price india investment",
    "nifty": "nifty 50 stock market index india",
    "real_estate": "india real estate housing market sector",
}


def fetch_rss_headlines(query: str, max_results: int = 5):
    headlines = []
    try:
        encoded_query = urllib.parse.quote_plus(query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            for item in root.findall(".//item")[:max_results]:
                title_node = item.find("title")
                if title_node is not None and title_node.text:
                    cleaned = title_node.text.split(" - ")[0].strip()
                    headlines.append(cleaned)
        else:
            log.warning("Google News RSS returned HTTP %s for query: %s", response.status_code, query)
    except Exception as e:
        log.error("Error parsing RSS for query '%s': %s", query, e)
    return headlines


def run_sentiment_analysis(db: Session):
    log.info("Starting sentiment analysis run...")
    try:
        classifier = get_classifier()
    except Exception as e:
        log.error("Failed to load FinBERT model: %s. Sentiment analysis aborted.", e)
        return

    for asset, query in QUERIES.items():
        log.info("Processing sentiment headlines for asset: %s", asset)
        headlines = fetch_rss_headlines(query, max_results=5)

        if not headlines:
            log.warning("No headlines found for asset: %s", asset)
            continue

        try:
            results = classifier(headlines)
            scores = []
            for i, result in enumerate(results):
                label = result["label"].upper()
                prob = result["score"]

                if label == "POSITIVE":
                    score_val = prob
                elif label == "NEGATIVE":
                    score_val = -prob
                else:
                    score_val = 0.0

                scores.append(score_val)
                db.add(
                    SentimentScore(
                        timestamp=datetime.now(timezone.utc),
                        asset=asset,
                        sentiment=score_val,
                        headline=headlines[i],
                        source="Google News RSS",
                    )
                )
                log.debug("Headline: '%s...' -> %s (%.2f)", headlines[i][:50], label, score_val)

            avg_sentiment = sum(scores) / len(scores) if scores else 0.0
            log.info("Average sentiment for %s: %.3f", asset, avg_sentiment)
        except Exception as e:
            log.error("Error predicting sentiment for %s: %s", asset, e)

    try:
        db.commit()
        log.info("Sentiment analysis committed to database.")
    except Exception as e:
        db.rollback()
        log.error("DB commit error in sentiment analyzer: %s", e)
