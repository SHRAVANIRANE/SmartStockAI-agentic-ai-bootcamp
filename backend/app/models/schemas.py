from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class ForecastRequest(BaseModel):
    store_id: str
    product_id: str
    horizon_days: int = Field(default=30, ge=1, le=90)


class ForecastPoint(BaseModel):
    date: date
    predicted_units: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    store_id: str
    product_id: str
    forecast: list[ForecastPoint]
    trend_summary: str
    seasonality_notes: str


class ReorderRequest(BaseModel):
    store_id: str
    product_id: str
    current_inventory: int = Field(ge=0)
    lead_time_days: Optional[int] = Field(default=7, ge=1, le=90)


class ReorderRecommendation(BaseModel):
    store_id: str
    product_id: str
    reorder_now: bool
    recommended_quantity: int
    reorder_point: int
    safety_stock: int
    reasoning: str


class TrendExplanation(BaseModel):
    store_id: str
    product_id: str
    trend_direction: str          # "upward" | "downward" | "stable"
    seasonality_pattern: str
    key_drivers: list[str]
    llm_explanation: str


class AgentChatRequest(BaseModel):
    message: str
    store_id: Optional[str] = None
    product_id: Optional[str] = None


class AgentChatResponse(BaseModel):
    response: str
    actions_taken: list[str]
