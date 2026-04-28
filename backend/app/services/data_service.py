import os
from pathlib import Path

import pandas as pd

from app.core.logging import get_logger
from app.pipeline.preprocessor import DataPreprocessor

logger = get_logger(__name__)


def _find_data_path() -> Path | None:
    env_path = os.getenv("DATA_PATH")
    if env_path:
        path = Path(env_path)
        if path.exists():
            logger.info("Using data file from DATA_PATH: %s", path)
            return path
        logger.warning("DATA_PATH was set but does not exist: %s", path)

    candidates = [
        Path(__file__).parents[4] / "inventory-demand-forecasting-shap" / "data" / "retail_store_inventory.csv",
        Path(__file__).parents[4] / "inventory-demand-forecasting-shap" / "data" / "sample_inventory.csv",
        Path(__file__).parents[3] / "data" / "retail_store_inventory.csv",
        Path(__file__).parents[3] / "data" / "sample_inventory.csv",
        Path(__file__).parents[2] / "data" / "retail_store_inventory.csv",
        Path(__file__).parents[2] / "data" / "sample_inventory.csv",
    ]
    for path in candidates:
        if path.exists():
            logger.info("Found data file: %s", path)
            return path
    return None


_DATA_PATH = _find_data_path()


class DataService:
    """Holds the active DataFrame in memory. Supports default CSV or uploaded data."""

    _df: pd.DataFrame | None = None
    _source: str = "default"

    def get_dataframe(self) -> pd.DataFrame:
        if self._df is None:
            if _DATA_PATH is None:
                raise ValueError(
                    "No default dataset found. Please upload a CSV or JSON file using the Data tab."
                )
            logger.info("Loading default dataset from %s", _DATA_PATH)
            preprocessor = DataPreprocessor()
            DataService._df = preprocessor.load(_DATA_PATH)
            DataService._source = _DATA_PATH.name
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
            "source": DataService._source,
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
            df = df[df["store_id"].astype(str) == str(store_id)]
        return sorted(df["product_id"].unique().tolist())

    @property
    def source(self) -> str:
        return DataService._source
