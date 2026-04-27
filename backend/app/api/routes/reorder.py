from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.dependencies import get_reorder_service
from app.models.schemas import ReorderRecommendation, ReorderRequest
from app.services.po_service import POService
from app.services.reorder_service import ReorderService

router = APIRouter(prefix="/reorder", tags=["Reorder"])


@router.post("/", response_model=ReorderRecommendation)
async def get_reorder(
    req: ReorderRequest,
    service: ReorderService = Depends(get_reorder_service),
) -> ReorderRecommendation:
    try:
        return await service.recommend(
            req.store_id,
            req.product_id,
            req.current_inventory,
            req.lead_time_days or 7,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/generate_po")
async def generate_po(
    req: ReorderRequest,
    service: ReorderService = Depends(get_reorder_service),
) -> Response:
    try:
        recommendation = await service.recommend(
            req.store_id,
            req.product_id,
            req.current_inventory,
            req.lead_time_days or 7,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    pdf_bytes = POService.generate_po_pdf(req.store_id, req.product_id, recommendation)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename=PO-{req.store_id}-{req.product_id}.pdf"
            )
        },
    )
