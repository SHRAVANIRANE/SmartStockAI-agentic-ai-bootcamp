import os
from pathlib import Path

import pandas as pd

from app.core.logging import get_logger
from app.pipeline.preprocessor import DataPreprocessor

logger = get_logger(__name__)

_BASE = Path(__file__).parents[3]
_DATA_PATH = Path(os.getenv("DATA_PATH", _BASE / "data" / "sample_inventory.csv"))


class DataService:
    """Holds the active DataFrame in memory. Supports default CSV or uploaded data."""

    _df: pd.DataFrame | None = None
    _source: str = "default"

    def get_dataframe(self) -> pd.DataFrame:
        if self._df is None:
            logger.info("Loading default dataset from %s", _DATA_PATH)
            preprocessor = DataPreprocessor()
            DataService._df = preprocessor.load(_DATA_PATH)
            DataService._source = "default"
        return self._df

    def load_uploaded_csv(self, content: bytes, filename: str) -> dict:
        """Load a new CSV file uploaded by the user."""
        import io

        preprocessor = DataPreprocessor()
        df = pd.read_csv(io.BytesIO(content))
        DataService._df = preprocessor.load_from_dataframe(df)
        DataService._source = filename
        logger.info("Loaded uploaded CSV: %s (%d rows)", filename, len(DataService._df))
        return {
            "rows": len(DataService._df),
            "stores": self.list_stores(),
            "products": self.list_products(),
            "source": filename,
        }

    def load_uploaded_json(self, data: list[dict], filename: str) -> dict:
        """Load JSON data uploaded by the user."""
        preprocessor = DataPreprocessor()
        DataService._df = preprocessor.load_from_json(data)
        DataService._source = filename
        logger.info("Loaded uploaded JSON: %s (%d rows)", filename, len(DataService._df))
        return {
            "rows": len(DataService._df),
            "stores": self.list_stores(),
            "products": self.list_products(),
            "source": filename,
        }

    def reset_to_default(self) -> dict:
        """Reset back to the default CSV dataset."""
        DataService._df = None
        DataService._source = "default"
        df = self.get_dataframe()
        return {
            "rows": len(df),
            "stores": self.list_stores(),
            "products": self.list_products(),
            "source": "default",
        }

    def get_product_data(self, store_id: str, product_id: str) -> pd.DataFrame:
        df = self.get_dataframe()
        preprocessor = DataPreprocessor()
        return preprocessor.filter_product(df, store_id, product_id)

    def list_stores(self) -> list[str]:
        return sorted(self.get_dataframe()["store_id"].unique().tolist())

    def list_products(self, store_id: str | None = None) -> list[str]:
        df = self.get_dataframe()
        if store_id:
            df = df[df["store_id"] == store_id]
        return sorted(df["product_id"].unique().tolist())

    @property
    def source(self) -> str:
        return DataService._source
