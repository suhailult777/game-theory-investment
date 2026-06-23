from datetime import datetime, timezone, timedelta
from app.core.data_quality import DataQualityMonitor
from app.database.models import DataQualityMetric


class TestDataQualityMonitor:
    def test_track_null_rate_records_one(self, db_session):
        monitor = DataQualityMonitor(db_session)
        monitor.track_null_rate("market_collector", "gold", 2400.0)
        monitor.track_null_rate("market_collector", "silver", None)
        monitor.flush()
        records = db_session.query(DataQualityMetric).all()
        assert len(records) == 2
        null_record = next(r for r in records if r.asset == "silver")
        assert float(null_record.metric_value) == 1.0
        non_null = next(r for r in records if r.asset == "gold")
        assert float(non_null.metric_value) == 0.0

    def test_track_outlier_detects_z_score_above_3(self, db_session):
        monitor = DataQualityMonitor(db_session)
        monitor.track_outlier("market_collector", "nifty", 99999.0, mean=22500.0, std=1000.0)
        monitor.flush()
        record = db_session.query(DataQualityMetric).first()
        assert float(record.metric_value) == 1.0

    def test_track_outlier_normal_value_not_outlier(self, db_session):
        monitor = DataQualityMonitor(db_session)
        monitor.track_outlier("market_collector", "nifty", 22400.0, mean=22500.0, std=1000.0)
        monitor.flush()
        record = db_session.query(DataQualityMetric).first()
        assert float(record.metric_value) == 0.0

    def test_track_outlier_zero_std_does_not_crash(self, db_session):
        monitor = DataQualityMonitor(db_session)
        monitor.track_outlier("market_collector", "gold", 2400.0, mean=2400.0, std=0.0)
        monitor.flush()
        assert db_session.query(DataQualityMetric).count() == 0

    def test_track_source_reliability_success(self, db_session):
        monitor = DataQualityMonitor(db_session)
        monitor.track_source_reliability("rbi_collector", "repo_rate", success=True)
        monitor.flush()
        record = db_session.query(DataQualityMetric).first()
        assert float(record.metric_value) == 1.0

    def test_track_source_reliability_failure(self, db_session):
        monitor = DataQualityMonitor(db_session)
        monitor.track_source_reliability("rbi_collector", "repo_rate", success=False)
        monitor.flush()
        record = db_session.query(DataQualityMetric).first()
        assert float(record.metric_value) == 0.0

    def test_summary_with_data(self, db_session_allows_commit):
        monitor = DataQualityMonitor(db_session_allows_commit)
        for i in range(10):
            monitor.track_source_reliability("market_collector", "gold", success=(i % 2 == 0))
        monitor.flush()
        summary = DataQualityMonitor.summary(db_session_allows_commit)
        assert summary["total_records"] == 10
        assert "market_collector" in summary["sources"]
        assert summary["sources"]["market_collector"]["success_rate"] == 50.0

    def test_summary_empty_db(self, db_session_allows_commit):
        summary = DataQualityMonitor.summary(db_session_allows_commit)
        assert summary["total_records"] == 0
        assert summary["sources"] == {}

    def test_overall_quality_score_100(self, db_session_allows_commit):
        monitor = DataQualityMonitor(db_session_allows_commit)
        for asset in ("gold", "silver", "nifty", "real_estate"):
            monitor.track_null_rate("market_collector", asset, 100.0)
            monitor.track_outlier("market_collector", asset, 100.0, mean=100.0, std=1.0)
        monitor.flush()
        summary = DataQualityMonitor.summary(db_session_allows_commit)
        assert summary["overall_quality_score"] == 100.0

    def test_overall_quality_score_with_issues(self, db_session_allows_commit):
        monitor = DataQualityMonitor(db_session_allows_commit)
        for i in range(10):
            monitor.track_source_reliability("rbi_collector", "repo_rate", success=False)
            monitor.track_null_rate("rbi_collector", "inflation", None)
        monitor.flush()
        summary = DataQualityMonitor.summary(db_session_allows_commit)
        assert summary["overall_quality_score"] < 50.0
