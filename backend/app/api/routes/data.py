import json
import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.api.dependencies import get_data_service, get_forecasting_service
from app.pipeline.preprocessor import DataPreprocessor
from app.core.logging import get_logger

router = APIRouter(prefix="/data", tags=["Data Upload"])
logger = get_logger(__name__)


def _clear_cache():
    fs = get_forecasting_service()
    fs._model_cache.clear()


def _read_csv_safe(content: bytes) -> pd.DataFrame:
    """Try multiple encodings to read CSV files from Kaggle or company exports."""
    encodings = ["utf-8", "utf-8-sig", "latin-1", "iso-8859-1", "cp1252"]
    for enc in encodings:
        try:
            df = pd.read_csv(io.BytesIO(content), encoding=enc, low_memory=False)
            logger.info("CSV read with encoding: %s", enc)
            return df
        except (UnicodeDecodeError, Exception):
            continue
    raise ValueError("Could not read CSV file. Please check the file is a valid CSV.")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> dict:
    ds = get_data_service()
    content = await file.read()
    filename = file.filename or "uploaded_file"

    try:
        if filename.lower().endswith(".json"):
            data = json.loads(content.decode("utf-8"))
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="JSON must be an array of objects")
            raw_df = pd.DataFrame(data)

        elif filename.lower().endswith(".csv"):
            raw_df = _read_csv_safe(content)

        else:
            raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")

        # Get column mapping preview before processing
        prep = DataPreprocessor()
        mapping = prep.get_column_mapping(raw_df.copy())

        # Process and load into data service
        processed_df = prep.load_from_dataframe(raw_df)
        from app.services.data_service import DataService
        DataService._df = processed_df
        DataService._source = filename

        _clear_cache()

        stores = sorted(processed_df["store_id"].unique().tolist())
        products = sorted(processed_df["product_id"].unique().tolist())

        return {
            "message": f"Successfully loaded {len(processed_df)} rows from {filename}",
            "rows": len(processed_df),
            "stores": stores,
            "products": products,
            "source": filename,
            "column_mapping": mapping,
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Upload failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/reset")
def reset_data() -> dict:
    ds = get_data_service()
    result = ds.reset_to_default()
    _clear_cache()
    return {
        "message": "Reset to default dataset",
        "rows": result["rows"],
        "stores": result["stores"],
        "products": result["products"],
        "source": result["source"],
    }


@router.get("/info")
def data_info() -> dict:
    ds = get_data_service()
    try:
        df = ds.get_dataframe()
        return {
            "source": ds.source,
            "rows": len(df),
            "stores": ds.list_stores(),
            "total_products": len(ds.list_products()),
        }
    except ValueError:
        return {
            "source": "none",
            "rows": 0,
            "stores": [],
            "total_products": 0,
        }
