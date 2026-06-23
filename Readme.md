# Game-Theory Investment Intelligence System

An automated investment decision platform that collects macro-economic data, market prices, and sentiment signals to generate game-theory-based investment recommendations for Gold, Silver, Stocks, and Real Estate.

## Architecture

```
                    +-------------------+
                    |   React Frontend  |
                    |   (Nginx :80)     |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |   FastAPI API     |
                    |   (uvicorn :8000) |
                    +---------+---------+
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
  +---------------+    +--------------+    +-------------+
  | Data Collector|    | Scoring Eng. |    | Sentiment AI|
  | (yfinance,    |    | (Game Theory)|    | (Transformers)
  |  RBI, News)   |    |              |    |             |
  +-------+-------+    +------+-------+    +------+------+
          |                   |                   |
          +-------------------+-------------------+
                              |
                              v
                    +-------------------+
                    | TimescaleDB :5432 |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Grafana :3000     |
                    +-------------------+
```

## Tech Stack

| Component  | Technology                                      |
| ---------- | ----------------------------------------------- |
| Backend    | Python 3.12, FastAPI, SQLAlchemy, APScheduler   |
| Frontend   | React 19, Vite, Nginx                           |
| Database   | TimescaleDB 2.14 (PostgreSQL 15)                |
| AI/ML     | PyTorch, HuggingFace Transformers (DistilBERT)  |
| Data      | yfinance, BeautifulSoup, httpx                  |
| Monitoring| Grafana 10.4                                    |
| Container | Docker, Docker Compose                          |

## Project Structure

```
game-theory-investement/
│
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route handlers
│   │   ├── services/      # Business logic layer
│   │   ├── collectors/    # Data collectors (market, RBI, etc.)
│   │   ├── scoring/       # Game-theory scoring engine
│   │   ├── sentiment/     # NLP sentiment analysis
│   │   ├── models/        # SQLAlchemy models
│   │   ├── database/      # DB connection & session
│   │   ├── scheduler/     # APScheduler job definitions
│   │   └── main.py        # FastAPI app entry point
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page-level components
│   │   ├── services/      # API client (axios)
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
│
├── database/
│   └── init.sql           # DB initialization script
│
├── grafana/
│   └── provisioning/      # Grafana auto-provisioning configs
│
├── docker-compose.yml     # Multi-service orchestration
├── Readme.md
└── spec.md                # Detailed design specification
```

## Quick Start (Docker)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

### Build & Run

```bash
# Build all images (no cache)
docker compose build --no-cache

# Start all services in the background
docker compose up -d

# Check container status
docker ps

# View logs
docker compose logs -f
```

### Services & Ports

| Service  | Port  | URL                          |
| -------- | ----- | ---------------------------- |
| Backend  | 8000  | http://localhost:8000         |
| Frontend | 80    | http://localhost:80           |
| Database | 5432  | postgresql://postgres:postgres@localhost:5432/investment |
| Grafana  | 3000  | http://localhost:3000         |

### Stop

```bash
docker compose down
```

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## API Endpoints

| Method | Path         | Description                |
| ------ | ------------ | -------------------------- |
| GET    | `/`          | Health check               |
| GET    | `/scores`    | Current investment scores  |
| GET    | `/docs`      | Swagger UI documentation   |

### `/scores` Response

```json
{
  "gold": 78,
  "silver": 66,
  "stocks": 58,
  "real_estate": 42
}
```

## Database Schema (TimescaleDB Hypertables)

| Table               | Description                        |
| ------------------- | ---------------------------------- |
| `market_prices`     | Real-time asset price data         |
| `macro_indicators`  | Macro-economic indicators          |
| `sentiment_scores`  | NLP sentiment analysis results     |
| `investment_scores` | Computed game-theory scores        |

All tables use TimescaleDB hypertables indexed on `timestamp` for time-series optimization.

## Game-Theory Scoring Logic

The scoring engine evaluates assets based on:

| Factor                   | Weight | Signal                                 |
| ------------------------ | ------ | -------------------------------------- |
| Inflation               | +10    | Inflation > 5%                         |
| INR Weakness            | +10    | USD/INR > 85                           |
| Market Fear             | +15    | Fear index > 70                        |
| Institutional Buying    | +15    | Smart money accumulation detected      |
| Crowd Euphoria Penalty  | -20    | Retail hype / euphoria                 |

**Recommendation thresholds:**
- `>= 70` → STRONG BUY
- `>= 50` → ACCUMULATE
- `>= 30` → HOLD
- `< 30`  → AVOID

## Grafana Dashboards

Pre-configured dashboards for monitoring:
- Gold & Silver price trends
- Inflation tracking
- INR / currency movement
- Sentiment index
- Liquidity indicators
- Institutional flow tracking

Grafana is auto-provisioned with datasources pointing to the TimescaleDB instance.

## Data Collectors

| Collector            | Source         | Frequency | Description                      |
| -------------------- | -------------- | --------- | -------------------------------- |
| Market Data          | yfinance       | 30 min    | Gold, Silver, Nifty, USD/INR    |
| RBI Macro Data       | RBI API/Scrape | Daily     | Repo rate, inflation             |
| Sentiment Analysis   | HuggingFace    | On-demand | NLP on news headlines            |
| News Scraping        | BeautifulSoup  | 60 min    | Financial news aggregation       |

## Future Enhancements

- **Phase 2**: Google Trends, FII/DII tracking, Reddit sentiment
- **Phase 3**: LLM-powered analysis (Ollama/Gemma), predictive risk engine, automated alerts

## License

MIT
