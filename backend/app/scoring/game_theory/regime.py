import numpy as np
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.models import MarketPrice, MacroIndicator
from app.core.config import ASSETS_MARKET
from app.core.log import get_logger

log = get_logger(__name__)


class MarketRegimeDetector:
    """Detect market regimes using HMM on macro + market features.

    Regimes:
        0: RISK_ON      — Low VIX, stable INR, positive flows, rising markets
        1: RISK_OFF     — Rising VIX, weak INR, negative flows, falling markets
        2: CRISIS       — Very high VIX, extreme flows, market stress
        3: TRANSITION   — Mixed signals, regime shift underway
    """

    REGIME_LABELS = ["RISK_ON", "RISK_OFF", "CRISIS", "TRANSITION"]

    def __init__(self):
        self._model = None
        self._feature_means = None
        self._feature_stds = None

    def _extract_features(self, db: Session) -> np.ndarray:
        """Extract feature vector: [vix_norm, fx_change, inst_flow_norm, gold_nifty_spread]."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)

        vix_rows = (
            db.query(MarketPrice)
            .filter(MarketPrice.asset == "india_vix", MarketPrice.timestamp >= cutoff)
            .order_by(MarketPrice.timestamp.asc())
            .all()
        )
        usd_rows = (
            db.query(MarketPrice)
            .filter(MarketPrice.asset == "usd_inr", MarketPrice.timestamp >= cutoff)
            .order_by(MarketPrice.timestamp.asc())
            .all()
        )
        gold_rows = (
            db.query(MarketPrice)
            .filter(MarketPrice.asset == "gold", MarketPrice.timestamp >= cutoff)
            .order_by(MarketPrice.timestamp.asc())
            .all()
        )
        nifty_rows = (
            db.query(MarketPrice)
            .filter(MarketPrice.asset == "nifty", MarketPrice.timestamp >= cutoff)
            .order_by(MarketPrice.timestamp.asc())
            .all()
        )
        fii_rows = (
            db.query(MacroIndicator)
            .filter(MacroIndicator.indicator == "fii_net_flow", MacroIndicator.timestamp >= cutoff)
            .order_by(MacroIndicator.timestamp.asc())
            .all()
        )

        if not (vix_rows and usd_rows and gold_rows and nifty_rows):
            return np.array([])

        timestamps = sorted({
            r.timestamp for r in vix_rows + usd_rows + gold_rows + nifty_rows
        })

        if len(timestamps) < 10:
            return np.array([])

        features = []
        latest_vix = float(vix_rows[-1].price)
        latest_usd = float(usd_rows[-1].price)
        latest_gold = float(gold_rows[-1].price)
        latest_nifty = float(nifty_rows[-1].price)

        # VIX level (normalized by 40 as approximate max panic)
        vix_norm = min(1.0, latest_vix / 40.0)

        # FX change over 30 days if enough history
        fx_change = 0.0
        if len(usd_rows) >= 2:
            old_idx = max(0, len(usd_rows) - 30)
            fx_change = (latest_usd - float(usd_rows[old_idx].price)) / float(usd_rows[old_idx].price)

        # Institutional flow (normalized)
        inst_flow = float(fii_rows[-1].value) / 2000.0 if fii_rows else 0.0

        # Gold/Nifty spread (safe haven demand)
        gn_spread = 0.0
        if latest_nifty > 0:
            gn_spread = latest_gold / latest_nifty

        features.append([vix_norm, fx_change, inst_flow, gn_spread])

        return np.array(features)

    def fit(self, db: Session):
        """Fit the HMM model on historical data."""
        try:
            from hmmlearn import hmm
        except ImportError:
            log.warning("hmmlearn not installed. Regime detection disabled.")
            return False

        features = self._extract_features(db)
        if features.shape[0] < 10:
            log.warning("Insufficient data for HMM fitting (need >= 10 days)")
            return False

        n_features = features.shape[1]

        self._model = hmm.GaussianHMM(
            n_components=4,
            covariance_type="diag",
            n_iter=200,
            random_state=42,
        )
        self._model.fit(features)

        log.info("HMM regime model fitted on %d observations", features.shape[0])
        return True

    def predict(self, db: Session) -> tuple[int, str]:
        """Predict current market regime.

        Returns:
            (regime_index, regime_label)
        """
        features = self._extract_features(db)
        if features.shape[0] < 1 or self._model is None:
            return 0, "RISK_ON"

        state = self._model.predict(features)[-1]
        state = min(state, len(self.REGIME_LABELS) - 1)
        return int(state), self.REGIME_LABELS[state]

    def regime_to_factor_modulator(self, regime_index: int) -> dict:
        """Return factor modulation weights for a given regime."""
        modulators = {
            0: {  # RISK_ON
                "inflation_factor": 0.7,
                "currency_factor": 0.8,
                "monetary_factor": 0.6,
                "vix_factor": 0.5,
                "inst_factor": 1.3,
                "sentiment_factor": 1.0,
                "description": "Risk appetite high. Reduce defensive weights, trust smart money.",
            },
            1: {  # RISK_OFF
                "inflation_factor": 1.2,
                "currency_factor": 1.3,
                "monetary_factor": 1.1,
                "vix_factor": 1.5,
                "inst_factor": 0.8,
                "sentiment_factor": 0.7,
                "description": "Risk aversion rising. Increase safe-haven exposure.",
            },
            2: {  # CRISIS
                "inflation_factor": 1.5,
                "currency_factor": 1.5,
                "monetary_factor": 1.3,
                "vix_factor": 2.0,
                "inst_factor": 0.5,
                "sentiment_factor": 0.3,
                "description": "Market stress extreme. Capital preservation mode.",
            },
            3: {  # TRANSITION
                "inflation_factor": 1.0,
                "currency_factor": 1.0,
                "monetary_factor": 1.0,
                "vix_factor": 1.2,
                "inst_factor": 1.0,
                "sentiment_factor": 0.8,
                "description": "Regime shift — mixed signals. Reduce conviction.",
            },
        }
        return modulators.get(regime_index, modulators[0])


_regime_detector = None


def get_regime_detector() -> MarketRegimeDetector:
    global _regime_detector
    if _regime_detector is None:
        _regime_detector = MarketRegimeDetector()
    return _regime_detector
