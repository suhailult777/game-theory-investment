from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database.models import DataQualityMetric
from app.core.log import get_logger
from app.core.schemas import MarketPriceData, MacroData, SentimentData

log = get_logger(__name__)


class DataQualityMonitor:
    """Tracks data quality metrics per collector run and flushes to the DB."""

    def __init__(self, db: Session):
        self.db = db
        self._pending: list[DataQualityMetric] = []

    # ------------------------------------------------------------------
    # Recording helpers
    # ------------------------------------------------------------------

    def track_null_rate(self, collector_name: str, asset: str, value, metric_name: str = "null_check"):
        """Record 1.0 if value is None, else 0.0."""
        is_null = 1.0 if value is None else 0.0
        self._store(collector_name, asset, metric_name, is_null)

    def track_outlier(self, collector_name: str, asset: str, value: float, mean: float, std: float):
        """Record 1.0 if |z-score| > 3 (outlier), else 0.0."""
        if std <= 0:
            return
        z_score = abs((value - mean) / std)
        is_outlier = 1.0 if z_score > 3 else 0.0
        self._store(collector_name, asset, "outlier_z3", is_outlier)

    def track_source_reliability(self, collector_name: str, asset: str, success: bool):
        """Record 1.0 for success, 0.0 for failure."""
        self._store(collector_name, asset, "source_success", 1.0 if success else 0.0)

    def track_range_violation(self, collector_name: str, asset: str, passed: bool, metric_name: str = "range_check"):
        """Record 1.0 if the value violates its expected range, else 0.0."""
        self._store(collector_name, asset, metric_name, 0.0 if passed else 1.0)

    # ------------------------------------------------------------------
    # Integration helpers for collectors
    # ------------------------------------------------------------------

    def validate_market_price(self, collector_name: str, asset: str, price) -> bool:
        try:
            validated = MarketPriceData(
                asset=asset, price=price,
                currency="USD", source=collector_name,
            )
            self.track_range_violation(collector_name, asset, passed=True, metric_name="schema_valid")
            return True
        except Exception as e:
            log.warning("MarketPrice validation failed for %s/%s: %s", collector_name, asset, e)
            self.track_range_violation(collector_name, asset, passed=False, metric_name="schema_valid")
            return False

    def validate_macro(self, collector_name: str, asset: str, value: float, indicator: str) -> bool:
        try:
            MacroData(indicator=indicator, value=value, source=collector_name)
            self.track_range_violation(collector_name, asset, passed=True, metric_name="schema_valid")
            return True
        except Exception as e:
            log.warning("Macro validation failed for %s/%s: %s", collector_name, indicator, e)
            self.track_range_violation(collector_name, asset, passed=False, metric_name="schema_valid")
            return False

    def validate_sentiment(self, collector_name: str, asset: str, sentiment: float, headline: str) -> bool:
        try:
            SentimentData(asset=asset, sentiment=sentiment, headline=headline, source=collector_name)
            self.track_range_violation(collector_name, asset, passed=True, metric_name="schema_valid")
            return True
        except Exception as e:
            log.warning("Sentiment validation failed for %s/%s: %s", collector_name, asset, e)
            self.track_range_violation(collector_name, asset, passed=False, metric_name="schema_valid")
            return False

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _store(self, collector_name: str, asset: str, metric_name: str, value: float):
        self._pending.append(
            DataQualityMetric(
                timestamp=datetime.now(timezone.utc),
                collector_name=collector_name,
                asset=asset,
                metric_name=metric_name,
                metric_value=value,
            )
        )

    def flush(self):
        if not self._pending:
            return
        for metric in self._pending:
            self.db.add(metric)
        try:
            self.db.commit()
            log.debug("Flushed %d data-quality metrics", len(self._pending))
            self._pending.clear()
        except Exception as e:
            self.db.rollback()
            log.error("Failed to flush data-quality metrics: %s", e)

    # ------------------------------------------------------------------
    # Query helpers (class methods)
    # ------------------------------------------------------------------

    @classmethod
    def summary(cls, db: Session, hours: int = 24) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        rows = (
            db.query(DataQualityMetric)
            .filter(DataQualityMetric.timestamp >= cutoff)
            .all()
        )

        if not rows:
            return {
                "total_records": 0,
                "period_hours": hours,
                "sources": {},
                "overall_quality_score": 100.0,
            }

        sources: dict[str, dict] = {}
        total_quality = 0.0
        metric_count = 0

        for row in rows:
            src = row.collector_name
            if src not in sources:
                sources[src] = {
                    "total": 0,
                    "success_count": 0,
                    "failure_count": 0,
                    "null_count": 0,
                    "outlier_count": 0,
                }
            sources[src]["total"] += 1

            val = float(row.metric_value)

            if row.metric_name == "source_success":
                if val > 0.5:
                    sources[src]["success_count"] += 1
                else:
                    sources[src]["failure_count"] += 1
                total_quality += val
                metric_count += 1
            elif row.metric_name == "null_check":
                if val > 0.5:
                    sources[src]["null_count"] += 1
                    total_quality += 0.0
                else:
                    total_quality += 1.0
                metric_count += 1
            elif row.metric_name == "outlier_z3":
                if val > 0.5:
                    sources[src]["outlier_count"] += 1
                    total_quality += 0.0
                else:
                    total_quality += 1.0
                metric_count += 1
            elif row.metric_name == "range_check" or row.metric_name == "schema_valid":
                total_quality += val
                metric_count += 1

        for src_name, stats in sources.items():
            stats["success_rate"] = (
                (stats["success_count"] / max(stats["total"], 1)) * 100
            )

        overall = round((total_quality / max(metric_count, 1)) * 100, 2)

        return {
            "total_records": len(rows),
            "period_hours": hours,
            "sources": sources,
            "overall_quality_score": overall,
        }
