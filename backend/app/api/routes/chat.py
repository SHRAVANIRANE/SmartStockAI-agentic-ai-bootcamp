from fastapi import APIRouter
from app.models.schemas import AgentChatRequest, AgentChatResponse
from app.core.config import get_settings
from app.core.logging import get_logger
from app.api.dependencies import get_data_service, get_forecasting_service, get_reorder_service
from concurrent.futures import ThreadPoolExecutor
import asyncio
import numpy as np

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = get_logger(__name__)
_executor = ThreadPoolExecutor(max_workers=4)

_CHAT_TEMPLATE = """You are an expert inventory management AI assistant.

Here is the REAL DATA for this product right now:

Store: {store_id} | Product: {product_id}
Current average daily demand: {avg_demand:.1f} units/day
7-day forecasted demand: {forecast_7d:.0f} units total
Demand trend: {trend}
Seasonality: {seasonality}
Reorder needed now: {reorder_now}
Recommended order quantity: {reorder_qty} units
Reorder point: {reorder_point} units
Safety stock: {safety_stock} units
Top demand drivers: {top_drivers}

User question: {message}

Answer based on the real data above. Be specific with numbers. Keep it 3-5 sentences.
"""


def _call_llm(prompt_data: dict) -> str:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    import time

    settings = get_settings()
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3,
    )
    chain = PromptTemplate.from_template(_CHAT_TEMPLATE) | llm | StrOutputParser()
    for attempt in range(3):
        try:
            return chain.invoke(prompt_data)
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(2)


@router.post("/", response_model=AgentChatResponse)
async def chat(req: AgentChatRequest) -> AgentChatResponse:
    store_id = req.store_id or "S001"
    product_id = req.product_id or "P0001"

    # Fetch real forecast and reorder data first
    try:
        ds = get_data_service()
        fs = get_forecasting_service()
        rs = get_reorder_service()

        forecast = await fs.forecast(store_id, product_id, horizon_days=7)
        reorder = await rs.recommend(store_id, product_id, current_inventory=100, lead_time_days=7)

        avg_demand = np.mean([p.predicted_units for p in forecast.forecast])
        forecast_7d = sum(p.predicted_units for p in forecast.forecast)

        prompt_data = {
            "store_id": store_id,
            "product_id": product_id,
            "avg_demand": avg_demand,
            "forecast_7d": forecast_7d,
            "trend": forecast.trend_summary[:100],
            "seasonality": forecast.seasonality_notes,
            "reorder_now": "YES" if reorder.reorder_now else "NO",
            "reorder_qty": reorder.recommended_quantity,
            "reorder_point": reorder.reorder_point,
            "safety_stock": reorder.safety_stock,
            "top_drivers": "lag features, rolling averages, seasonality",
            "message": req.message,
        }
    except Exception as e:
        logger.warning("Could not fetch real data for chat: %s — using generic mode", e)
        prompt_data = {
            "store_id": store_id,
            "product_id": product_id,
            "avg_demand": 0,
            "forecast_7d": 0,
            "trend": "unknown",
            "seasonality": "unknown",
            "reorder_now": "unknown",
            "reorder_qty": 0,
            "reorder_point": 0,
            "safety_stock": 0,
            "top_drivers": "historical patterns",
            "message": req.message,
        }

    try:
        loop = asyncio.get_event_loop()
        response = await asyncio.wait_for(
            loop.run_in_executor(_executor, _call_llm, prompt_data),
            timeout=30,
        )
    except asyncio.TimeoutError:
        logger.warning("LLM chat timed out")
        response = (
            f"Based on real data: {product_id} at {store_id} has avg demand of "
            f"{prompt_data['avg_demand']:.0f} units/day with {prompt_data['forecast_7d']:.0f} units "
            f"forecasted this week. Reorder needed: {prompt_data['reorder_now']}."
        )
    except Exception as e:
        logger.error("Chat failed: %s", e)
        response = "Unable to process your question right now. Please try again."

    return AgentChatResponse(response=response, actions_taken=["data_fetch", "llm_chat"])
