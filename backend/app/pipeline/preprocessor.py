import pandas as pd
import numpy as np
import json
from pathlib import Path
from app.core.logging import get_logger
from app.services.external_factors import ExternalFactorsService

logger = get_logger(__name__)

# Flexible column mapping — maps common variations to standard names
COLUMN_ALIASES = {
    "date": ["date", "Date", "DATE", "order_date", "sale_date", "transaction_date"],
    "store_id": ["store_id", "Store ID", "store", "StoreID", "store_code", "branch_id"],
    "product_id": ["product_id", "Product ID", "product", "ProductID", "sku", "item_id", "product_code"],
    "units_sold": ["units_sold", "Units Sold", "sales", "quantity", "qty", "quantity_sold", "units"],
    "inventory_level": ["inventory_level", "Inventory Level", "stock", "inventory", "stock_level", "on_hand"],
    "price": ["price", "Price", "unit_price", "selling_price", "sale_price"],
    "discount": ["discount", "Discount", "discount_pct", "discount_percent", "promo_discount"],
    "weather_condition": ["weather_condition", "Weather Condition", "weather", "Weather"],
    "is_promotion": ["is_promotion", "Holiday/Promotion", "promotion", "promo", "is_promo", "holiday"],
    "competitor_price": ["competitor_price", "Competitor Pricing", "competitor_pricing", "comp_price"],
    "seasonality": ["seasonality", "Seasonality", "season", "Season"],
    "category": ["category", "Category", "product_category", "dept"],
    "region": ["region", "Region", "area", "zone"],
}

REQUIRED_COLS = {"date", "store_id", "product_id", "units_sold"}


class DataPreprocessor:
    """
    Cleans and prepares inventory data from CSV or JSON.
    Supports flexible column names for any company data format.
    """

    def load(self, path: str | Path) -> pd.DataFrame:
        path = Path(path)
        if path.suffix.lower() == ".json":
            df = pd.read_json(path)
        else:
            df = pd.read_csv(path)
        return self._process(df)

    def load_from_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        return self._process(df)

    def load_from_json(self, data: list[dict]) -> pd.DataFrame:
        df = pd.DataFrame(data)
        return self._process(df)

    def _process(self, df: pd.DataFrame) -> pd.DataFrame:
        df = self._normalize_columns(df)
        self._validate(df)
        return self._clean(df)

    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map any column name variation to standard names."""
        rename_map = {}
        for standard_name, aliases in COLUMN_ALIASES.items():
            for alias in aliases:
                if alias in df.columns and standard_name not in df.columns:
                    rename_map[alias] = standard_name
                    break
        if rename_map:
            logger.info("Remapped columns: %s", rename_map)
            df = df.rename(columns=rename_map)
        return df

    def _validate(self, df: pd.DataFrame) -> None:
        missing = REQUIRED_COLS - set(df.columns)
        if missing:
            raise ValueError(
                f"Missing required columns: {missing}. "
                f"Your data has: {list(df.columns)}. "
                f"Required: date, store_id, product_id, units_sold"
            )

    def _clean(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["units_sold"] = pd.to_numeric(df["units_sold"], errors="coerce").fillna(0).clip(lower=0)

        # Fill optional columns with defaults if missing
        defaults = {
            "inventory_level": 0,
            "price": 0.0,
            "discount": 0,
            "weather_condition": "Unknown",
            "is_promotion": 0,
            "competitor_price": 0.0,
            "seasonality": "Unknown",
            "category": "Unknown",
            "region": "Unknown",
        }
        for col, default in defaults.items():
            if col not in df.columns:
                df[col] = default
                logger.info("Column '%s' not found — using default: %s", col, default)

        df.columns = [c.lower().replace(" ", "_") for c in df.columns]
        df = df.sort_values(["store_id", "product_id", "date"]).reset_index(drop=True)
        
        # Enrich with live simulated external factors
        df = ExternalFactorsService.enrich_data(df)
        
        logger.info("Loaded %d rows after cleaning and enriching", len(df))
        return df

    def filter_product(self, df: pd.DataFrame, store_id: str, product_id: str) -> pd.DataFrame:
        mask = (df["store_id"] == store_id) & (df["product_id"] == product_id)
        result = df[mask].copy()
        if result.empty:
            raise ValueError(f"No data for store={store_id}, product={product_id}")
        return result
