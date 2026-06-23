from sqlalchemy import Column, String, Integer, Numeric, Text, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from app.database.db import Base

class MarketPrice(Base):
    __tablename__ = "market_prices"

    timestamp = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    asset = Column(String(50), primary_key=True)
    price = Column(Numeric, nullable=False)
    currency = Column(String(10), nullable=False)
    source = Column(String(100), nullable=False)


class MacroIndicator(Base):
    __tablename__ = "macro_indicators"

    timestamp = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    indicator = Column(String(100), primary_key=True)
    value = Column(Numeric, nullable=False)
    source = Column(String(100), nullable=False)


class SentimentScore(Base):
    __tablename__ = "sentiment_scores"

    timestamp = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    asset = Column(String(50), primary_key=True)
    sentiment = Column(Numeric, nullable=False)
    headline = Column(Text, primary_key=True)
    source = Column(String(100), nullable=False)


class InvestmentScore(Base):
    __tablename__ = "investment_scores"

    timestamp = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    asset = Column(String(50), primary_key=True)
    total_score = Column(Numeric, nullable=False)
    recommendation = Column(String(50), nullable=False)
    details = Column(JSON, nullable=False)


class DataQualityMetric(Base):
    __tablename__ = "data_quality_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    collector_name = Column(String(100), nullable=False)
    asset = Column(String(50), nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Numeric, nullable=False)
    details = Column(Text, nullable=True)


class NashEquilibrium(Base):
    __tablename__ = "nash_equilibria"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    equilibrium_found = Column(String(10), nullable=False)
    num_equilibria = Column(Integer, nullable=False)
    l2_distance = Column(Numeric, nullable=True)
    pure_nash_exists = Column(String(10), nullable=False)
    lambda_rationality = Column(Numeric, nullable=True)
    rationality_label = Column(String(20), nullable=True)
    regime_index = Column(Integer, nullable=True)
    regime_label = Column(String(20), nullable=True)


class MarketRegime(Base):
    __tablename__ = "market_regimes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    regime_index = Column(Integer, nullable=False)
    regime_label = Column(String(20), nullable=False)
    modulator_json = Column(JSON, nullable=True)


class StrategyFitness(Base):
    __tablename__ = "strategy_fitness"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    strategy_name = Column(String(50), nullable=False)
    fitness = Column(Numeric, nullable=False)
    population_share = Column(Numeric, nullable=False)
    is_dominant = Column(String(10), nullable=False)


class GoogleTrendScore(Base):
    __tablename__ = "google_trend_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    keyword = Column(String(200), nullable=False)
    search_interest = Column(Numeric, nullable=False)
    trend_change_7d = Column(Numeric, nullable=True)
    source = Column(String(100), nullable=False)


class EnsembleScore(Base):
    __tablename__ = "ensemble_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    ensemble_score = Column(Numeric, nullable=False)
    ensemble_confidence = Column(Numeric, nullable=True)
    sub_model_scores = Column(JSON, nullable=True)
    mmc_score = Column(Numeric, nullable=True)
    weights_used = Column(JSON, nullable=True)


class ModelCorrelation(Base):
    __tablename__ = "model_correlations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    model_a = Column(String(50), nullable=False)
    model_b = Column(String(50), nullable=False)
    correlation = Column(Numeric, nullable=False)
    num_samples = Column(Integer, nullable=False)


class FictitiousPlayResult(Base):
    __tablename__ = "fictitious_play_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    n_agents = Column(Integer, nullable=False)
    equilibrium_distance = Column(Numeric, nullable=True)
    dominant_strategy = Column(String(50), nullable=True)
    action_distribution = Column(JSON, nullable=True)
    strategy_distribution = Column(JSON, nullable=True)
    converged = Column(String(10), nullable=False)


class FTPLResult(Base):
    __tablename__ = "ftpl_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    recommended_action = Column(String(50), nullable=True)
    regret = Column(Numeric, nullable=True)
    action_probabilities = Column(JSON, nullable=True)


class MeanFieldResult(Base):
    __tablename__ = "mean_field_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    asset = Column(String(50), nullable=False)
    retail_exposure_mean = Column(Numeric, nullable=True)
    retail_exposure_variance = Column(Numeric, nullable=True)
    optimal_strategy = Column(String(50), nullable=True)
    convergence = Column(Numeric, nullable=True)
    position_distribution = Column(JSON, nullable=True)
    n_iterations = Column(Integer, nullable=True)
