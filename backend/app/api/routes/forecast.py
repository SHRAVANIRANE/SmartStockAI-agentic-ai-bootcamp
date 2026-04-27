from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_data_service, get_forecasting_service
from app.models.schemas import (
    DemandPatternResponse,
    ExternalFactorInfo,
    ExternalFactorsResponse,
    ForecastRequest,
    ForecastResponse,
    KPIRiskRequest,
    KPIRiskResponse,
    SimulationRequest,
    SimulationResponse,
    TrendExplanation,
)
from app.services.data_service import DataService
from app.services.external_factors import ExternalFactorsService
from app.services.forecasting_service import ForecastingService

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


@router.get("/stores")
def get_stores(ds: DataService = Depends(get_data_service)) -> dict:
    return {"stores": ds.list_stores()}


@router.get("/products")
def get_products(store_id: str, ds: DataService = Depends(get_data_service)) -> dict:
    return {"products": ds.list_products(store_id)}


@router.post("/", response_model=ForecastResponse)
async def get_forecast(
    req: ForecastRequest,
    service: ForecastingService = Depends(get_forecasting_service),
) -> ForecastResponse:
    try:
        return await service.forecast(req.store_id, req.product_id, req.horizon_days)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_forecast(
    req: SimulationRequest,
    service: ForecastingService = Depends(get_forecasting_service),
) -> SimulationResponse:
    try:
        return await service.simulate(req)
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


@router.post("/kpi_risk", response_model=KPIRiskResponse)
async def get_kpi_risk(
    req: KPIRiskRequest,
    service: ForecastingService = Depends(get_forecasting_service),
) -> KPIRiskResponse:
    try:
        return await service.get_kpis_and_risk(
            req.store_id,
            req.product_id,
            req.current_inventory,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/pattern", response_model=DemandPatternResponse)
def get_pattern(
    store_id: str,
    product_id: str,
    service: ForecastingService = Depends(get_forecasting_service),
) -> DemandPatternResponse:
    try:
        return service.get_demand_pattern(store_id, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/external_factors", response_model=ExternalFactorsResponse)
def get_external_factors(
    store_id: str,
    product_id: str,
    data_service: DataService = Depends(get_data_service),
) -> ExternalFactorsResponse:
    df = data_service.get_dataframe()
    start_date = date.today() if df.empty else df["date"].max().date()
    factors = ExternalFactorsService.get_upcoming_factors(start_date=start_date, days=7)

    return ExternalFactorsResponse(
        store_id=store_id,
        product_id=product_id,
        upcoming_factors=[ExternalFactorInfo(**factor) for factor in factors],
    )
