from fastapi import APIRouter, Depends, Response
from app.models.schemas import ReorderRequest, ReorderRecommendation
from app.services.reorder_service import ReorderService
from app.services.po_service import POService
from app.api.dependencies import get_reorder_service

router = APIRouter(prefix="/reorder", tags=["Reorder"])


@router.post("/", response_model=ReorderRecommendation)
async def get_reorder(
    req: ReorderRequest,
    service: ReorderService = Depends(get_reorder_service),
) -> ReorderRecommendation:
    return await service.recommend(
        req.store_id, req.product_id, req.current_inventory, req.lead_time_days
    )


@router.post("/generate_po")
async def generate_po(
    req: ReorderRequest,
    service: ReorderService = Depends(get_reorder_service),
) -> Response:
    recommendation = await service.recommend(
        req.store_id, req.product_id, req.current_inventory, req.lead_time_days
    )
    
    pdf_bytes = POService.generate_po_pdf(req.store_id, req.product_id, recommendation)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=PO-{req.store_id}-{req.product_id}.pdf"
        }
    )
