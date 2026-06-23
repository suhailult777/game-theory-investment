import time
import functools
from app.core.log import get_logger

log = get_logger(__name__)


def with_retries(max_attempts=3, delay=2.0, backoff=2.0, exceptions=(Exception,)):
    """Decorator: retry a callable with exponential backoff on failure."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_exc = None
            attempt_delay = delay
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt < max_attempts - 1:
                        log.warning("Retry %d/%d for %s: %s — waiting %.1fs", attempt + 1, max_attempts, fn.__name__, e, attempt_delay)
                        time.sleep(attempt_delay)
                        attempt_delay *= backoff
            raise last_exc
        return wrapper
    return decorator


def get_last_known(db, model, filter_field, filter_value, value_field="value"):
    """Fetch the most recent stored value as a fallback when live fetch fails."""
    from sqlalchemy import desc
    record = (
        db.query(model)
        .filter(filter_field == filter_value)
        .order_by(desc(model.timestamp))
        .first()
    )
    return float(getattr(record, value_field)) if record else None
