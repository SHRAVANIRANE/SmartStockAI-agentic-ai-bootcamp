import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.api.dependencies import get_data_service, get_forecasting_service

router = APIRouter(prefix="/data", tags=["Data Upload"])


def _clear_cache():
    """Clear model cache on the singleton forecasting service."""
    fs = get_forecasting_service()
    fs._model_cache.clear()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> dict:
    ds = get_data_service()
    content = await file.read()
    filename = file.filename or "uploaded_file"

    try:
        if filename.endswith(".json"):
            data = json.loads(content)
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="JSON must be an array of objects")
            result = ds.load_uploaded_json(data, filename)
        elif filename.endswith(".csv"):
            result = ds.load_uploaded_csv(content, filename)
        else:
            raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")

        # Clear model cache AFTER new data is loaded into the singleton data service
        _clear_cache()

        return {
            "message": f"Successfully loaded {result['rows']} rows from {filename}",
            "rows": result["rows"],
            "stores": result["stores"],
            "products": result["products"],
            "source": result["source"],
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/reset")
def reset_data() -> dict:
    ds = get_data_service()
    result = ds.reset_to_default()
    _clear_cache()
    return {
        "message": "Reset to default dataset",
        "rows": result["rows"],
        "stores": result["stores"],
        "source": result["source"],
    }


@router.get("/info")
def data_info() -> dict:
    ds = get_data_service()
    return {
        "source": ds.source,
        "rows": len(ds.get_dataframe()),
        "stores": ds.list_stores(),
        "total_products": len(ds.list_products()),
    }
