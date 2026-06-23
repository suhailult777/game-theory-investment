from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime


class MarketPriceData(BaseModel):
    asset: str = Field(min_length=1, max_length=50)
    price: float = Field(gt=0, description="Must be a positive price")
    currency: str = Field(min_length=1, max_length=10)
    source: str = Field(min_length=1, max_length=100)

    @field_validator("price")
    @classmethod
    def price_not_extreme(cls, v):
        if v > 1_000_000:
            raise ValueError(f"Price {v} exceeds sanity limit of 1,000,000")
        return v


class MacroData(BaseModel):
    indicator: str = Field(min_length=1, max_length=100)
    value: float
    source: str = Field(min_length=1, max_length=100)

    @field_validator("value")
    @classmethod
    def validate_by_indicator(cls, v, info):
        ind = info.data.get("indicator", "").lower()
        if "repo" in ind and not (0 < v < 20):
            raise ValueError(f"repo_rate must be between 0 and 20, got {v}")
        if "inflation" in ind and not (0 < v < 50):
            raise ValueError(f"inflation must be between 0 and 50, got {v}")
        if "flow" in ind and abs(v) > 50_000:
            raise ValueError(f"flow value {v} exceeds sanity limit of 50,000")
        return v


class SentimentData(BaseModel):
    asset: str = Field(min_length=1, max_length=50)
    sentiment: float = Field(ge=-1.0, le=1.0)
    headline: str = Field(min_length=1, max_length=500)
    source: str = Field(min_length=1, max_length=100)


class InvestmentScoreData(BaseModel):
    asset: str = Field(min_length=1, max_length=50)
    total_score: float = Field(ge=0, le=100)
    recommendation: str = Field(pattern=r"^(STRONG BUY|ACCUMULATE|HOLD|AVOID)$")
    details: dict


class MarketPriceResponse(BaseModel):
    price: float
    currency: str
    timestamp: Optional[str] = None


class ScoreResponse(BaseModel):
    asset: str
    score: float
    recommendation: str
    details: dict
    timestamp: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    stale_data_count: int
    server_time_utc: str
    categories: dict
