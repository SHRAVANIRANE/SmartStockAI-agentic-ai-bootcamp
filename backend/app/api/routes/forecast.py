from fastapi import APIRouter, Depends
from app.models.schemas import ForecastRequest, ForecastResponse, TrendExplanation, KPIRiskRequest, KPIRiskResponse, DemandPatternResponse, ExternalFactorsResponse, ExternalFactorInfo, SimulationRequest, SimulationResponse
from app.services.forecasting_service import ForecastingService
from app.services.data_service import DataService
from app.services.external_factors import ExternalFactorsService
from app.api.dependencies import get_forecasting_service, get_data_service

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
    return await service.forecast(req.store_id, req.product_id, req.horizon_days)


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_forecast(
    req: SimulationRequest,
    service: ForecastingService = Depends(get_forecasting_service),
) -> SimulationResponse:
    return await service.simulate(req)


@router.get("/trends", response_model=TrendExplanation)
async def get_trends(
    store_id: str,
    product_id: str,
    service: ForecastingService = Depends(get_forecasting_service),
) -> TrendExplanation:
    return await service.explain_trends(store_id, product_id)


@router.post("/kpi_risk", response_model=KPIRiskResponse)
async def get_kpi_risk(
    req: KPIRiskRequest,
    service: ForecastingService = Depends(get_forecasting_service),
) -> KPIRiskResponse:
    return await service.get_kpis_and_risk(req.store_id, req.product_id, req.current_inventory)


@router.get("/pattern", response_model=DemandPatternResponse)
def get_pattern(
    store_id: str,
    product_id: str,
    service: ForecastingService = Depends(get_forecasting_service),
) -> DemandPatternResponse:
    return service.get_demand_pattern(store_id, product_id)


@router.get("/external_factors", response_model=ExternalFactorsResponse)
def get_external_factors(
    store_id: str,
    product_id: str,
    data_service: DataService = Depends(get_data_service)
) -> ExternalFactorsResponse:
    df = data_service.get_dataframe()
    if df.empty:
        from datetime import date
        start_date = date.today()
    else:
        start_date = df["date"].max().date()
        
    factors = ExternalFactorsService.get_upcoming_factors(start_date=start_date, days=7)
    
    return ExternalFactorsResponse(
        store_id=store_id,
        product_id=product_id,
        upcoming_factors=[ExternalFactorInfo(**f) for f in factors]
    )
