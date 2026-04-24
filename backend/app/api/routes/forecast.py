from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ForecastRequest, ForecastResponse, TrendExplanation
from app.services.forecasting_service import ForecastingService
from app.api.dependencies import get_forecasting_service

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


@router.post("/", response_model=ForecastResponse)
async def get_forecast(
    req: ForecastRequest,
    service: ForecastingService = Depends(get_forecasting_service),
) -> ForecastResponse:
    try:
        return await service.forecast(req.store_id, req.product_id, req.horizon_days)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/trends", response_model=TrendExplanation)
async def get_trends(
    store_id: str,
    product_id: str,
    service: ForecastingService = Depends(get_forecasting_service),
) -> TrendExplanation:
    try:
        return await service.explain_trends(store_id, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
