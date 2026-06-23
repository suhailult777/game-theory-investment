from datetime import datetime, timezone
from app.database.models import MacroIndicator


def add_macro(db, indicator, value, source="test"):
    db.add(MacroIndicator(
        timestamp=datetime.now(timezone.utc),
        indicator=indicator, value=value, source=source,
    ))
