from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, timezone
import traceback
from app.database.db import SessionLocal
from app.collectors.market_collector import fetch_and_store_market_data
from app.collectors.rbi_collector import fetch_and_store_rbi_data
from app.collectors.fii_dii_collector import fetch_and_store_fii_dii_data
from app.sentiment.analyzer import run_sentiment_analysis
from app.scoring.engine import calculate_scores
from app.scoring.game_theory.regime import get_regime_detector
from app.collectors.trends_collector import run_trends_collection
from app.core.config import GT_REGIME_RETRAIN_HOURS, TRENDS_COLLECT_HOURS
from app.core.log import get_logger

log = get_logger(__name__)
scheduler = BackgroundScheduler()


def _with_session(fn):
    def wrapper():
        db = SessionLocal()
        try:
            fn(db)
        except Exception as e:
            log.error("Job %s failed: %s", fn.__name__, e)
            traceback.print_exc()
        finally:
            db.close()
    return wrapper


run_market_collection_job = _with_session(fetch_and_store_market_data)
run_macro_collection_job = _with_session(fetch_and_store_rbi_data)
run_fii_dii_collection_job = _with_session(fetch_and_store_fii_dii_data)
run_sentiment_job = _with_session(run_sentiment_analysis)
run_scoring_job = _with_session(calculate_scores)


def _fit_regime_job():
    db = SessionLocal()
    try:
        detector = get_regime_detector()
        detector.fit(db)
        log.info("Regime model retrained.")
    except Exception as e:
        log.error("Regime retrain failed: %s", e)
    finally:
        db.close()


run_regime_job = _fit_regime_job

run_trends_job = _with_session(run_trends_collection)


def start_scheduler():
    now = datetime.now(timezone.utc)

    scheduler.add_job(
        run_market_collection_job,
        "interval",
        minutes=30,
        id="market_collector_job",
        replace_existing=True,
    )
    scheduler.add_job(
        run_sentiment_job,
        "interval",
        hours=2,
        id="sentiment_job",
        replace_existing=True,
    )
    scheduler.add_job(
        run_scoring_job,
        "interval",
        minutes=30,
        id="scoring_job",
        replace_existing=True,
        next_run_time=now + timedelta(seconds=60),
    )
    scheduler.add_job(
        run_macro_collection_job,
        "interval",
        days=1,
        id="macro_collector_job",
        replace_existing=True,
    )
    scheduler.add_job(
        run_fii_dii_collection_job,
        "interval",
        days=1,
        id="fii_dii_collector_job",
        replace_existing=True,
    )
    scheduler.add_job(
        run_regime_job,
        "interval",
        hours=GT_REGIME_RETRAIN_HOURS,
        id="regime_job",
        replace_existing=True,
    )
    scheduler.add_job(
        run_trends_job,
        "interval",
        hours=TRENDS_COLLECT_HOURS,
        id="trends_job",
        replace_existing=True,
    )

    log.info("Scheduling immediate seed jobs...")
    scheduler.add_job(run_market_collection_job, "date", run_date=now + timedelta(seconds=2), id="init_market_job")
    scheduler.add_job(run_macro_collection_job, "date", run_date=now + timedelta(seconds=5), id="init_macro_job")
    scheduler.add_job(run_sentiment_job, "date", run_date=now + timedelta(seconds=8), id="init_sentiment_job")
    scheduler.add_job(run_fii_dii_collection_job, "date", run_date=now + timedelta(seconds=12), id="init_fii_dii_job")
    scheduler.add_job(run_scoring_job, "date", run_date=now + timedelta(seconds=25), id="init_scoring_job")

    scheduler.start()
    log.info("Background scheduler active.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("Scheduler stopped.")
