import pandas as pd
import os
from pathlib import Path
from app.pipeline.preprocessor import DataPreprocessor
from app.core.logging import get_logger

logger = get_logger(__name__)

_DATA_PATH = Path(
    os.getenv(
        "DATA_PATH",
        Path(__file__).parents[3] / "data" / "retail_store_inventory.csv",
    )
)


class DataService:
    """Singleton-style service that holds the cleaned DataFrame in memory."""

    _df: pd.DataFrame | None = None

    def get_dataframe(self) -> pd.DataFrame:
        if self._df is None:
            logger.info("Loading dataset from %s", _DATA_PATH)
            preprocessor = DataPreprocessor()
            DataService._df = preprocessor.load(_DATA_PATH)
        return self._df

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
