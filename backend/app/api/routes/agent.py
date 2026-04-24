import asyncio
import re
from fastapi import APIRouter, HTTPException
from app.agents.inventory_agent import build_inventory_agent
from app.api.dependencies import (
    get_data_service,
    get_forecasting_service,
    get_reorder_service,
)
from app.models.schemas import AgentChatRequest, AgentChatResponse

router = APIRouter(prefix="/agent", tags=["Agent"])

_agent_executor = None


def _get_agent():
    global _agent_executor
    if _agent_executor is None:
        _agent_executor = build_inventory_agent()
    return _agent_executor


def _extract_inventory(message: str) -> int | None:
    patterns = [
        r"with\s+(\d+)\s+units",
        r"have\s+(\d+)\s+units",
        r"inventory\s*(?:is|=|:)?\s*(\d+)",
        r"stock\s*(?:is|=|:)?\s*(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, flags=re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


async def _try_direct_answer(req: AgentChatRequest) -> AgentChatResponse | None:
    message = req.message.lower()
    store_id = req.store_id
    product_id = req.product_id

    if "product" in message and "list" in message and store_id:
        products = get_data_service().list_products(store_id)
        return AgentChatResponse(
            response=f"Products available in {store_id}: {', '.join(products[:20])}.",
            actions_taken=["list_available_products"],
        )

    if any(word in message for word in ["reorder", "order", "stock"]) and store_id and product_id:
        inventory = _extract_inventory(req.message)
        if inventory is None:
            inventory = 100

        rec = await get_reorder_service().recommend(
            store_id=store_id,
            product_id=product_id,
            current_inventory=inventory,
            lead_time_days=7,
        )
        action = "reorder now" if rec.reorder_now else "hold current stock"
        return AgentChatResponse(
            response=(
                f"For {product_id} at {store_id}, you should {action}. "
                f"Current inventory is {inventory} units, reorder point is {rec.reorder_point}, "
                f"safety stock is {rec.safety_stock}, and the recommended order quantity is "
                f"{rec.recommended_quantity} units. {rec.reasoning}"
            ),
            actions_taken=["get_reorder_recommendation"],
        )

    if any(word in message for word in ["forecast", "demand", "trend"]) and store_id and product_id:
        forecast = await get_forecasting_service().forecast(store_id, product_id, horizon_days=7)
        avg = sum(point.predicted_units for point in forecast.forecast) / len(forecast.forecast)
        return AgentChatResponse(
            response=(
                f"The 7-day average forecast for {product_id} at {store_id} is "
                f"{avg:.1f} units per day. {forecast.trend_summary}"
            ),
            actions_taken=["get_forecast_summary"],
        )

    return None


@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(req: AgentChatRequest) -> AgentChatResponse:
    try:
        direct_answer = await _try_direct_answer(req)
        if direct_answer:
            return direct_answer
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    agent = _get_agent()
    context = req.message
    if req.store_id:
        context += f" (Store: {req.store_id})"
    if req.product_id:
        context += f" (Product: {req.product_id})"

    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: agent.invoke({"input": context})),
            timeout=45,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="Inventory agent timed out. Try a direct reorder or forecast question.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Inventory agent is unavailable.") from exc

    return AgentChatResponse(
        response=result["output"],
        actions_taken=[str(step) for step in result.get("intermediate_steps", [])],
    )
