-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Market Prices Table
CREATE TABLE IF NOT EXISTS market_prices (
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    asset VARCHAR(50) NOT NULL,
    price NUMERIC NOT NULL,
    currency VARCHAR(10) NOT NULL,
    source VARCHAR(100) NOT NULL
);

-- Convert to hypertable
SELECT create_hypertable('market_prices', 'timestamp', if_not_exists => TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_prices_asset_time ON market_prices (asset, timestamp DESC);

-- Macro Indicators Table
CREATE TABLE IF NOT EXISTS macro_indicators (
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    indicator VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    source VARCHAR(100) NOT NULL
);

-- Convert to hypertable
SELECT create_hypertable('macro_indicators', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_macro_indicators_name_time ON macro_indicators (indicator, timestamp DESC);

-- Sentiment Scores Table
CREATE TABLE IF NOT EXISTS sentiment_scores (
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    asset VARCHAR(50) NOT NULL,
    sentiment NUMERIC NOT NULL, -- normalized range [-1.0, 1.0]
    headline TEXT NOT NULL,
    source VARCHAR(100) NOT NULL
);

-- Convert to hypertable
SELECT create_hypertable('sentiment_scores', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_sentiment_scores_asset_time ON sentiment_scores (asset, timestamp DESC);

-- Investment Scores Table
CREATE TABLE IF NOT EXISTS investment_scores (
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    asset VARCHAR(50) NOT NULL,
    total_score NUMERIC NOT NULL,
    recommendation VARCHAR(50) NOT NULL,
    details JSONB NOT NULL
);

-- Convert to hypertable
SELECT create_hypertable('investment_scores', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_investment_scores_asset_time ON investment_scores (asset, timestamp DESC);

-- Insert Seed Data (Historical dummy records to populate the UI and Grafana dashboard initially)
INSERT INTO market_prices (timestamp, asset, price, currency, source) VALUES
(NOW() - INTERVAL '4 days', 'gold', 2300.50, 'USD', 'Seed'),
(NOW() - INTERVAL '3 days', 'gold', 2315.20, 'USD', 'Seed'),
(NOW() - INTERVAL '2 days', 'gold', 2320.10, 'USD', 'Seed'),
(NOW() - INTERVAL '1 days', 'gold', 2345.80, 'USD', 'Seed'),
(NOW(), 'gold', 2350.00, 'USD', 'Seed'),

(NOW() - INTERVAL '4 days', 'silver', 28.50, 'USD', 'Seed'),
(NOW() - INTERVAL '3 days', 'silver', 29.10, 'USD', 'Seed'),
(NOW() - INTERVAL '2 days', 'silver', 28.90, 'USD', 'Seed'),
(NOW() - INTERVAL '1 days', 'silver', 29.80, 'USD', 'Seed'),
(NOW(), 'silver', 30.20, 'USD', 'Seed'),

(NOW() - INTERVAL '4 days', 'nifty', 22100.00, 'INR', 'Seed'),
(NOW() - INTERVAL '3 days', 'nifty', 22250.00, 'INR', 'Seed'),
(NOW() - INTERVAL '2 days', 'nifty', 22300.00, 'INR', 'Seed'),
(NOW() - INTERVAL '1 days', 'nifty', 22400.00, 'INR', 'Seed'),
(NOW(), 'nifty', 22520.00, 'INR', 'Seed'),

(NOW() - INTERVAL '4 days', 'usd_inr', 83.20, 'INR', 'Seed'),
(NOW() - INTERVAL '3 days', 'usd_inr', 83.35, 'INR', 'Seed'),
(NOW() - INTERVAL '2 days', 'usd_inr', 83.40, 'INR', 'Seed'),
(NOW() - INTERVAL '1 days', 'usd_inr', 83.45, 'INR', 'Seed'),
(NOW(), 'usd_inr', 83.50, 'INR', 'Seed'),

(NOW() - INTERVAL '4 days', 'real_estate', 810.00, 'INR', 'Seed'),
(NOW() - INTERVAL '3 days', 'real_estate', 795.00, 'INR', 'Seed'),
(NOW() - INTERVAL '2 days', 'real_estate', 788.00, 'INR', 'Seed'),
(NOW() - INTERVAL '1 days', 'real_estate', 775.00, 'INR', 'Seed'),
(NOW(), 'real_estate', 780.00, 'INR', 'Seed'),

(NOW() - INTERVAL '4 days', 'india_vix', 18.50, 'POINTS', 'Seed'),
(NOW() - INTERVAL '3 days', 'india_vix', 17.20, 'POINTS', 'Seed'),
(NOW() - INTERVAL '2 days', 'india_vix', 16.80, 'POINTS', 'Seed'),
(NOW() - INTERVAL '1 days', 'india_vix', 16.00, 'POINTS', 'Seed'),
(NOW(), 'india_vix', 16.50, 'POINTS', 'Seed');

INSERT INTO macro_indicators (timestamp, indicator, value, source) VALUES
(NOW() - INTERVAL '4 days', 'repo_rate', 6.50, 'RBI'),
(NOW() - INTERVAL '4 days', 'inflation', 5.10, 'MoSPI'),
(NOW(), 'repo_rate', 6.50, 'RBI'),
(NOW(), 'inflation', 5.10, 'MoSPI'),
(NOW() - INTERVAL '1 day', 'fii_net_flow', -1500.00, 'Seed'),
(NOW() - INTERVAL '1 day', 'dii_net_flow', 1200.00, 'Seed');

INSERT INTO sentiment_scores (timestamp, asset, sentiment, headline, source) VALUES
(NOW() - INTERVAL '1 day', 'gold', 0.65, 'Gold prices surge on macro uncertainty and central bank buying', 'Google News'),
(NOW() - INTERVAL '1 day', 'nifty', -0.20, 'Nifty drops on valuation concerns and foreign outflows', 'Google News');

-- Game Theory Tables
CREATE TABLE IF NOT EXISTS nash_equilibria (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    asset VARCHAR(50) NOT NULL,
    equilibrium_found VARCHAR(10) NOT NULL,
    num_equilibria INTEGER NOT NULL,
    l2_distance NUMERIC,
    pure_nash_exists VARCHAR(10) NOT NULL,
    lambda_rationality NUMERIC,
    rationality_label VARCHAR(20),
    regime_index INTEGER,
    regime_label VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_nash_eq_asset_time ON nash_equilibria (asset, timestamp DESC);

CREATE TABLE IF NOT EXISTS market_regimes (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    regime_index INTEGER NOT NULL,
    regime_label VARCHAR(20) NOT NULL,
    modulator_json JSONB
);
CREATE INDEX IF NOT EXISTS idx_market_regimes_time ON market_regimes (timestamp DESC);

CREATE TABLE IF NOT EXISTS strategy_fitness (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    asset VARCHAR(50) NOT NULL,
    strategy_name VARCHAR(50) NOT NULL,
    fitness NUMERIC NOT NULL,
    population_share NUMERIC NOT NULL,
    is_dominant VARCHAR(10) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_strategy_fitness_asset_time ON strategy_fitness (asset, timestamp DESC);

INSERT INTO investment_scores (timestamp, asset, total_score, recommendation, details) VALUES
(NOW(), 'gold', 50.0, 'ACCUMULATE', '{"base_score": 50, "inflation": 10, "usd_inr": 0, "monetary_policy": 5, "fear_index": 0, "institutional_buying": -5, "crowd_hype": -10, "nash_distance": 0, "rationality": 0, "evolution": 0, "regime_mod": 0}'),
(NOW(), 'silver', 60.0, 'ACCUMULATE', '{"base_score": 50, "inflation": 10, "usd_inr": 0, "monetary_policy": 5, "fear_index": 0, "institutional_buying": -5, "crowd_hype": 0, "nash_distance": 0, "rationality": 0, "evolution": 0, "regime_mod": 0}'),
(NOW(), 'nifty', 40.0, 'HOLD', '{"base_score": 50, "inflation": -5, "usd_inr": 5, "monetary_policy": -5, "fear_index": 0, "institutional_buying": -5, "crowd_hype": 0, "nash_distance": 0, "rationality": 0, "evolution": 0, "regime_mod": 0}'),
(NOW(), 'real_estate', 55.0, 'ACCUMULATE', '{"base_score": 50, "inflation": 10, "usd_inr": 0, "monetary_policy": -5, "fear_index": 0, "institutional_buying": 0, "crowd_hype": 0, "nash_distance": 0, "rationality": 0, "evolution": 0, "regime_mod": 0}');
