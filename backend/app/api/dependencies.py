from functools import lru_cache
from app.services.data_service import DataService
from app.services.llm_service import LLMService
from app.services.forecasting_service import ForecastingService
from app.services.reorder_service import ReorderService


@lru_cache
def get_data_service() -> DataService:
    return DataService()


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService()


@lru_cache
def get_forecasting_service() -> ForecastingService:
    return ForecastingService(get_data_service(), get_llm_service())


@lru_cache
def get_reorder_service() -> ReorderService:
    fs = get_forecasting_service()
    return ReorderService(get_data_service(), get_llm_service(), fs)
