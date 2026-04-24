from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ReorderRequest, ReorderRecommendation
from app.services.reorder_service import ReorderService
from app.api.dependencies import get_reorder_service

router = APIRouter(prefix="/reorder", tags=["Reorder"])


@router.post("/", response_model=ReorderRecommendation)
async def get_reorder(
    req: ReorderRequest,
    service: ReorderService = Depends(get_reorder_service),
) -> ReorderRecommendation:
    try:
        return await service.recommend(
            req.store_id, req.product_id, req.current_inventory, req.lead_time_days
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
