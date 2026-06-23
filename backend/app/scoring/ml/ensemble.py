import os
import json
import pickle
import warnings
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.log import get_logger
from app.database.models import MarketPrice, MacroIndicator, SentimentScore, InvestmentScore
from app.database.models import NashEquilibrium, MarketRegime, StrategyFitness, GoogleTrendScore
from app.core.config import ASSETS_SCORED, ENGINE_FALLBACK_PRICES
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

warnings.filterwarnings("ignore", category=UserWarning)

log = get_logger(__name__)

MODELS_DIR = Path(os.getenv("ENSEMBLE_MODELS_DIR", str(Path(__file__).parent / "models")))
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "price_return_1d", "price_return_7d", "price_return_30d",
    "inflation", "repo_rate", "vix",
    "fii_net_flow", "dii_net_flow", "total_inst_flow",
    "sentiment", "nash_l2_distance", "qre_lambda",
    "evolution_concentration", "regime_index", "trend_change_7d",
    "usd_inr_level", "usd_inr_stress",
]

MODEL_NAMES = ["xgboost", "lightgbm", "logistic", "neural_net", "rule_based"]

try:
    import torch.nn as nn

    class SimpleMLP(nn.Module):
        def __init__(self, n_in):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(n_in, 32),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(32, 16),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(16, 1),
            )

        def forward(self, x):
            return self.net(x).squeeze(-1)

    _HAS_NN = True
except Exception:
    _HAS_NN = False


def _asset_path(asset: str, suffix: str = "") -> Path:
    return MODELS_DIR / f"{asset}{suffix}"


def _get_price_at(db: Session, asset: str, before: datetime, fallback: float) -> float:
    record = (
        db.query(MarketPrice)
        .filter(MarketPrice.asset == asset, MarketPrice.timestamp <= before)
        .order_by(desc(MarketPrice.timestamp))
        .first()
    )
    return float(record.price) if record else fallback


def _get_prices_before(db: Session, asset: str, before: datetime, limit: int = 30):
    records = (
        db.query(MarketPrice)
        .filter(MarketPrice.asset == asset, MarketPrice.timestamp <= before)
        .order_by(desc(MarketPrice.timestamp))
        .limit(limit)
        .all()
    )
    return [float(r.price) for r in records]


def _get_macro_at(db: Session, indicator: str, before: datetime, fallback: float) -> float:
    record = (
        db.query(MacroIndicator)
        .filter(MacroIndicator.indicator == indicator, MacroIndicator.timestamp <= before)
        .order_by(desc(MacroIndicator.timestamp))
        .first()
    )
    return float(record.value) if record else fallback


def _get_latest_sentiment_at(db: Session, asset: str, before: datetime) -> float:
    seven_days = before - timedelta(days=7)
    records = (
        db.query(SentimentScore)
        .filter(
            SentimentScore.asset == asset,
            SentimentScore.timestamp <= before,
            SentimentScore.timestamp >= seven_days,
        )
        .all()
    )
    if records:
        return sum(float(r.sentiment) for r in records) / len(records)
    return 0.0


def _get_nash_at(db: Session, asset: str, before: datetime):
    record = (
        db.query(NashEquilibrium)
        .filter(NashEquilibrium.asset == asset, NashEquilibrium.timestamp <= before)
        .order_by(desc(NashEquilibrium.timestamp))
        .first()
    )
    if record:
        return (float(record.l2_distance) if record.l2_distance else 0.5,
                float(record.lambda_rationality) if record.lambda_rationality else 0.0)
    return (0.5, 0.0)


def _get_regime_at(db: Session, before: datetime):
    record = (
        db.query(MarketRegime)
        .filter(MarketRegime.timestamp <= before)
        .order_by(desc(MarketRegime.timestamp))
        .first()
    )
    return record.regime_index if record else 0


def _get_evolution_at(db: Session, asset: str, before: datetime) -> float:
    records = (
        db.query(StrategyFitness)
        .filter(StrategyFitness.asset == asset, StrategyFitness.timestamp <= before)
        .order_by(desc(StrategyFitness.timestamp))
        .limit(8)
        .all()
    )
    if records:
        shares = [float(r.population_share) for r in records if r.population_share is not None]
        if shares:
            return max(shares)
    return 0.25


def _get_trends_at(db: Session, asset: str, before: datetime) -> float:
    record = (
        db.query(GoogleTrendScore)
        .filter(GoogleTrendScore.asset == asset, GoogleTrendScore.timestamp <= before)
        .order_by(desc(GoogleTrendScore.timestamp))
        .first()
    )
    if record and record.trend_change_7d is not None:
        return float(record.trend_change_7d)
    return 0.0


def build_features_for_asset(db: Session, asset: str, timestamp: datetime) -> np.ndarray:
    prices = _get_prices_before(db, asset, timestamp, limit=30)
    p = prices[0] if prices else ENGINE_FALLBACK_PRICES.get(asset, 100.0)

    ret_1d = ((prices[0] - prices[1]) / prices[1]) if len(prices) >= 2 else 0.0
    ret_7d = ((prices[0] - prices[6]) / prices[6]) if len(prices) >= 7 else 0.0
    ret_30d = ((prices[0] - prices[29]) / prices[29]) if len(prices) >= 30 else 0.0

    inflation = _get_macro_at(db, "inflation", timestamp, 5.1)
    repo_rate = _get_macro_at(db, "repo_rate", timestamp, 6.5)
    fii = _get_macro_at(db, "fii_net_flow", timestamp, 0.0)
    dii = _get_macro_at(db, "dii_net_flow", timestamp, 0.0)
    total_flow = fii + dii

    usd_inr = _get_price_at(db, "usd_inr", timestamp, 83.5)
    usd_inr_hist = _get_prices_before(db, "usd_inr", timestamp, limit=30)
    usd_inr_avg = sum(usd_inr_hist) / len(usd_inr_hist) if usd_inr_hist else 83.5
    usd_inr_stress = 1.0 if usd_inr > usd_inr_avg * 1.02 else 0.0

    vix = _get_price_at(db, "india_vix", timestamp, 16.0)

    sentiment = _get_latest_sentiment_at(db, asset, timestamp)
    nash_dist, qre_lambda = _get_nash_at(db, asset, timestamp)
    regime_idx = _get_regime_at(db, timestamp)
    evo_conc = _get_evolution_at(db, asset, timestamp)
    trend = _get_trends_at(db, asset, timestamp)

    features = np.array([
        ret_1d, ret_7d, ret_30d,
        inflation, repo_rate, vix,
        fii, dii, total_flow,
        sentiment, nash_dist, qre_lambda,
        evo_conc, float(regime_idx), trend,
        usd_inr, usd_inr_stress,
    ], dtype=np.float64)

    return features


def build_training_data(db: Session, asset) -> tuple:
    score_records = (
        db.query(InvestmentScore)
        .filter(InvestmentScore.asset == asset)
        .order_by(desc(InvestmentScore.timestamp))
        .limit(500)
        .all()
    )
    score_records.reverse()

    if len(score_records) < 20:
        log.warning("Not enough historical scores for %s to train ensemble (need >=20, have %d)", asset, len(score_records))
        return None, None

    X_list, y_list = [], []
    for rec in score_records:
        ts = rec.timestamp
        features = build_features_for_asset(db, asset, ts)
        prices_forward = _get_prices_before(db, asset, ts + timedelta(days=30), limit=30)
        if len(prices_forward) < 5:
            continue
        current_p = prices_forward[0]
        future_p = prices_forward[-1]
        if current_p > 0:
            forward_return = (future_p - current_p) / current_p
            y_list.append(forward_return)
            X_list.append(features)

    if len(X_list) < 20:
        return None, None

    return np.array(X_list), np.array(y_list)


def train_xgboost(X_train, y_train, X_val, y_val):
    try:
        import xgboost as xgb
        model = xgb.XGBRegressor(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, n_jobs=-1,
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        return model
    except Exception as e:
        log.warning("XGBoost training failed: %s", e)
        return None


def train_lightgbm(X_train, y_train, X_val, y_val):
    try:
        import lightgbm as lgb
        model = lgb.LGBMRegressor(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, n_jobs=-1, verbose=-1,
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)])
        return model
    except Exception as e:
        log.warning("LightGBM training failed: %s", e)
        return None


def train_logistic_model(X_train, y_train):
    try:
        y_binned = np.digitize(y_train, bins=np.percentile(y_train, [33, 66])) - 1
        model = LogisticRegression(max_iter=1000, C=1.0, multi_class="multinomial", random_state=42)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_train)
        model.fit(X_scaled, y_binned)
        return {"model": model, "scaler": scaler, "type": "logistic"}
    except Exception as e:
        log.warning("Logistic training failed: %s", e)
        return None


def train_neural_net(X_train, y_train, X_val, y_val):
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim

        if not _HAS_NN:
            raise RuntimeError("SimpleMLP not available")

        n_features = X_train.shape[1]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_train)
        Xv_scaled = scaler.transform(X_val)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = SimpleMLP(n_features).to(device)
        optimizer = optim.Adam(model.parameters(), lr=0.01)
        criterion = nn.MSELoss()

        X_t = torch.FloatTensor(X_scaled).to(device)
        y_t = torch.FloatTensor(y_train).to(device)
        X_v = torch.FloatTensor(Xv_scaled).to(device)
        y_v = torch.FloatTensor(y_val).to(device)

        best_val_loss = float("inf")
        best_state = None
        for epoch in range(100):
            model.train()
            optimizer.zero_grad()
            pred = model(X_t)
            loss = criterion(pred, y_t)
            loss.backward()
            optimizer.step()

            if epoch % 10 == 0:
                model.eval()
                with torch.no_grad():
                    vpred = model(X_v)
                    vloss = criterion(vpred, y_v).item()
                if vloss < best_val_loss:
                    best_val_loss = vloss
                    best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                model.train()

        if best_state:
            model.load_state_dict(best_state)
        model.eval()
        return {"model": model, "scaler": scaler, "type": "neural_net", "device": device}
    except Exception as e:
        log.warning("Neural net training failed: %s", e)
        return None


def train_rule_based(X_train, y_train):
    from sklearn.linear_model import LinearRegression
    try:
        model = LinearRegression()
        feature_weights = np.array([
            0.05, 0.05, 0.03,
            0.10, 0.08, 0.08,
            0.06, 0.06, 0.07,
            0.08, 0.05, 0.05,
            0.06, 0.02, 0.04,
            0.05, 0.03,
        ])
        model.coef_ = feature_weights[:X_train.shape[1]]
        model.intercept_ = 0.0
        return model
    except Exception as e:
        log.warning("Rule-based model init failed: %s", e)
        return None


def compute_mmc(predictions_dict: dict) -> dict:
    model_names = list(predictions_dict.keys())
    if len(model_names) < 2:
        return {m: 0.0 for m in model_names}

    corr_matrix = {}
    for i, m1 in enumerate(model_names):
        for j, m2 in enumerate(model_names):
            if i >= j:
                continue
            p1 = np.array(predictions_dict[m1])
            p2 = np.array(predictions_dict[m2])
            if np.std(p1) < 1e-8 or np.std(p2) < 1e-8:
                corr = 0.0
            else:
                corr = np.corrcoef(p1, p2)[0, 1]
            corr_matrix[frozenset([m1, m2])] = corr

    mmc_scores = {}
    for m in model_names:
        others = [n for n in model_names if n != m]
        avg_corr = np.mean([corr_matrix[frozenset([m, o])] for o in others]) if others else 0.0
        penalty = max(0.0, avg_corr - 0.3) / 0.7
        mmc_scores[m] = 1.0 - penalty

    return {"correlations": {f"{m1}_{m2}": corr_matrix[frozenset([m1, m2])]
                             for m1, m2 in [(a, b) for a in model_names for b in model_names
                                            if model_names.index(a) < model_names.index(b)]},
            "mmc_scores": mmc_scores}


class EnsembleTrainer:
    def __init__(self, db: Session):
        self.db = db

    def train_for_asset(self, asset: str) -> bool:
        X, y = build_training_data(self.db, asset)
        if X is None or len(X) < 20:
            return False

        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

        models = {}
        predictions = {}

        xgb_model = train_xgboost(X_train, y_train, X_val, y_val)
        if xgb_model is not None:
            models["xgboost"] = xgb_model
            predictions["xgboost"] = xgb_model.predict(X_val).tolist()

        lgb_model = train_lightgbm(X_train, y_train, X_val, y_val)
        if lgb_model is not None:
            models["lightgbm"] = lgb_model
            predictions["lightgbm"] = lgb_model.predict(X_val).tolist()

        logit = train_logistic_model(X_train, y_train)
        if logit is not None:
            models["logistic"] = logit
            logit_preds = logit["model"].predict_proba(logit["scaler"].transform(X_val))
            predictions["logistic"] = (logit_preds[:, -1] - logit_preds[:, 0]).tolist()

        nn_model = train_neural_net(X_train, y_train, X_val, y_val)
        if nn_model is not None:
            models["neural_net"] = nn_model
            import torch
            nn_model["model"].eval()
            with torch.no_grad():
                Xv_scaled = nn_model["scaler"].transform(X_val)
                Xv_t = torch.FloatTensor(Xv_scaled).to(nn_model["device"])
                predictions["neural_net"] = nn_model["model"](Xv_t).cpu().numpy().tolist()

        rule = train_rule_based(X_train, y_train)
        if rule is not None:
            models["rule_based"] = rule
            predictions["rule_based"] = rule.predict(X_val).tolist()

        if not models:
            log.warning("No models trained for %s", asset)
            return False

        mmc_result = compute_mmc(predictions)

        val_scores = {}
        for name, preds in predictions.items():
            y_val_trim = y_val[:len(preds)]
            val_scores[name] = max(0, r2_score(y_val_trim, preds))
        total_val = sum(val_scores.values()) or 1.0
        weights = {n: s / total_val for n, s in val_scores.items()}

        serializable_models = {}
        for name, m in models.items():
            if name == "neural_net":
                nn_path = _asset_path(asset, "_nn.pt")
                scaler_path = _asset_path(asset, "_nn_scaler.pkl")
                torch.save(m["model"].state_dict(), str(nn_path))
                with open(str(scaler_path), "wb") as f:
                    pickle.dump(m["scaler"], f)
                serializable_models["neural_net"] = {
                    "type": "neural_net",
                    "state_dict_path": str(nn_path),
                    "scaler_path": str(scaler_path),
                    "n_features": m["model"].net[0].in_features,
                }
            else:
                serializable_models[name] = m

        artifact = {
            "models": serializable_models,
            "weights": weights,
            "mmc": mmc_result,
            "val_scores": val_scores,
            "feature_cols": FEATURE_COLS,
            "n_samples": len(X),
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }

        model_path = _asset_path(asset, "_ensemble.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(artifact, f)

        log.info("Ensemble trained for %s: %d samples, %d models, weights=%s",
                 asset, len(X), len(models), weights)
        return True

    def train_all(self) -> dict:
        results = {}
        for asset in ASSETS_SCORED:
            results[asset] = self.train_for_asset(asset)
        return results


class EnsemblePredictor:
    def __init__(self, db: Session):
        self.db = db
        self._artifacts = {}

    def _load_asset(self, asset: str) -> dict:
        if asset not in self._artifacts:
            model_path = _asset_path(asset, "_ensemble.pkl")
            if model_path.exists():
                with open(model_path, "rb") as f:
                    raw = pickle.load(f)
                models = raw.get("models", {})
                for name, m in list(models.items()):
                    if isinstance(m, dict) and m.get("type") == "neural_net":
                        if _HAS_NN:
                            import torch
                            nn_model = SimpleMLP(m.get("n_features", 17))
                            sd_path = m["state_dict_path"]
                            if os.path.exists(sd_path):
                                nn_model.load_state_dict(torch.load(sd_path, map_location="cpu"))
                            nn_model.eval()
                            scaler_path = m.get("scaler_path", "")
                            scaler = None
                            if os.path.exists(scaler_path):
                                with open(scaler_path, "rb") as sf:
                                    scaler = pickle.load(sf)
                            if scaler is None:
                                scaler = StandardScaler()
                            models[name] = {"model": nn_model, "scaler": scaler,
                                            "type": "neural_net", "device": "cpu"}
                        else:
                            models.pop(name, None)
                raw["models"] = models
                self._artifacts[asset] = raw
        return self._artifacts.get(asset)

    def predict(self, asset: str, timestamp: datetime = None) -> dict:
        artifact = self._load_asset(asset)
        if artifact is None:
            return {"ensemble_score": None, "confidence": 0.0, "sub_scores": {}, "mmc_score": None}

        ts = timestamp or datetime.now(timezone.utc)
        features = build_features_for_asset(self.db, asset, ts).reshape(1, -1)

        sub_scores = {}
        weights = artifact["weights"]
        models = artifact["models"]

        if "xgboost" in models:
            try:
                sub_scores["xgboost"] = float(models["xgboost"].predict(features)[0])
            except Exception as e:
                log.warning("XGBoost predict failed for %s: %s", asset, e)

        if "lightgbm" in models:
            try:
                sub_scores["lightgbm"] = float(models["lightgbm"].predict(features)[0])
            except Exception as e:
                log.warning("LightGBM predict failed for %s: %s", asset, e)

        if "logistic" in models:
            try:
                logit = models["logistic"]
                probs = logit["model"].predict_proba(logit["scaler"].transform(features))[0]
                if len(probs) >= 2:
                    sub_scores["logistic"] = float(probs[-1] - probs[0])
                else:
                    sub_scores["logistic"] = 0.0
            except Exception as e:
                log.warning("Logistic predict failed for %s: %s", asset, e)

        if "neural_net" in models:
            try:
                import torch
                nn = models["neural_net"]
                X_scaled = nn["scaler"].transform(features)
                X_t = torch.FloatTensor(X_scaled).to(nn["device"])
                nn["model"].eval()
                with torch.no_grad():
                    sub_scores["neural_net"] = float(nn["model"](X_t).cpu().numpy()[0])
            except Exception as e:
                log.warning("Neural net predict failed for %s: %s", asset, e)

        if "rule_based" in models:
            try:
                sub_scores["rule_based"] = float(models["rule_based"].predict(features)[0])
            except Exception as e:
                log.warning("Rule-based predict failed for %s: %s", asset, e)

        if not sub_scores:
            return {"ensemble_score": None, "confidence": 0.0, "sub_scores": {}, "mmc_score": None}

        active_weights = {k: weights.get(k, 0.0) for k in sub_scores}
        total_w = sum(active_weights.values()) or 1.0
        ensemble_score = sum(sub_scores[k] * active_weights[k] / total_w for k in sub_scores)

        preds_list = [sub_scores[k] for k in sub_scores]
        confidence = 1.0 - (np.std(preds_list) / (abs(np.mean(preds_list)) + 1e-8))
        confidence = max(0.0, min(1.0, confidence))

        mmc_scores = artifact.get("mmc", {}).get("mmc_scores", {})
        active_mmc = [mmc_scores.get(k, 1.0) for k in sub_scores]
        mmc_score = sum(active_mmc) / len(active_mmc) if active_mmc else 1.0

        return {
            "ensemble_score": ensemble_score,
            "confidence": confidence,
            "sub_scores": sub_scores,
            "mmc_score": mmc_score,
        }

    def is_trained(self, asset: str) -> bool:
        return _asset_path(asset, "_ensemble.pkl").exists()
