from datetime import datetime, timezone, timedelta

STALE_THRESHOLDS = {
    "market_price": timedelta(hours=2),
    "macro": timedelta(hours=26),
    "sentiment": timedelta(hours=3),
    "score": timedelta(hours=2),
}


def _ensure_aware(dt: datetime) -> datetime:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def is_stale(timestamp: datetime | None, data_type: str) -> bool:
    if timestamp is None:
        return True
    threshold = STALE_THRESHOLDS.get(data_type, timedelta(hours=2))
    age = datetime.now(timezone.utc) - _ensure_aware(timestamp)
    return age > threshold


def staleness_report(timestamps: dict[str, datetime | None]) -> dict:
    return {
        key: {
            "is_stale": is_stale(ts, key),
            "age_hours": round((datetime.now(timezone.utc) - _ensure_aware(ts)).total_seconds() / 3600, 2) if ts else None,
            "last_updated": _ensure_aware(ts).isoformat() if ts else None,
        }
        for key, ts in timestamps.items()
    }
