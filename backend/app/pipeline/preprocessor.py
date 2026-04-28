from pathlib import Path

import numpy as np
import pandas as pd

from app.core.logging import get_logger
from app.services.external_factors import ExternalFactorsService

logger = get_logger(__name__)

# Extended column aliases covering common Kaggle retail datasets and company exports.
COLUMN_ALIASES = {
    "date": [
        "date", "Date", "DATE", "order_date", "sale_date", "transaction_date",
        "week", "Week", "day", "Day", "period", "time", "timestamp",
        "InvoiceDate", "invoice_date", "OrderDate", "SaleDate",
    ],
    "store_id": [
        "store_id", "Store ID", "store", "Store", "StoreID", "store_code",
        "branch_id", "branch", "Branch", "location", "Location", "shop",
        "store_nbr", "Store_nbr", "StoreNumber", "store_number",
    ],
    "product_id": [
        "product_id", "Product ID", "product", "Product", "ProductID",
        "sku", "SKU", "item_id", "item", "Item", "ItemID", "product_code",
        "StockCode", "stock_code", "Description", "item_nbr", "family",
        "Family", "ProductName", "product_name",
    ],
    "units_sold": [
        "units_sold", "Units Sold", "sales", "Sales", "quantity", "Quantity",
        "qty", "Qty", "quantity_sold", "units", "Units", "Weekly_Sales",
        "weekly_sales", "transactions", "Transactions", "unit_sales",
        "Sales_Quantity", "sold_quantity", "demand", "Demand",
    ],
    "inventory_level": [
        "inventory_level", "Inventory Level", "stock", "Stock", "inventory",
        "Inventory", "stock_level", "on_hand", "onhand", "stock_on_hand",
        "InventoryLevel", "current_stock",
    ],
    "price": [
        "price", "Price", "unit_price", "UnitPrice", "selling_price",
        "sale_price", "SalePrice", "retail_price", "RetailPrice",
        "unit_cost", "cost", "Cost",
    ],
    "discount": [
        "discount", "Discount", "discount_pct", "discount_percent",
        "promo_discount", "MarkDown", "markdown", "promotion_discount",
    ],
    "weather_condition": [
        "weather_condition", "Weather Condition", "weather", "Weather",
    ],
    "is_promotion": [
        "is_promotion", "Holiday/Promotion", "promotion", "promo",
        "is_promo", "holiday", "Holiday", "IsHoliday", "is_holiday",
        "Promo", "promo_active", "on_promotion",
    ],
    "competitor_price": [
        "competitor_price", "Competitor Pricing", "competitor_pricing",
        "comp_price", "competition_price", "CompetitorPrice",
    ],
    "seasonality": [
        "seasonality", "Seasonality", "season", "Season",
        "quarter_name", "period_name",
    ],
    "category": [
        "category", "Category", "product_category", "dept", "Department",
        "family", "Family", "class", "Class", "type", "Type",
        "ProductCategory", "item_category",
    ],
    "region": [
        "region", "Region", "area", "Area", "zone", "Zone",
        "city", "City", "state", "State", "country", "Country",
    ],
}

REQUIRED_COLS = {"date", "store_id", "product_id", "units_sold"}


class DataPreprocessor:
    """
    Cleans and prepares inventory data from CSV or JSON sources.
    Handles common retail dataset schemas and auto-generates missing identifiers
    where a reasonable default is possible.
    """

    def load(self, path: str | Path) -> pd.DataFrame:
        path = Path(path)
        df = pd.read_json(path) if path.suffix.lower() == ".json" else pd.read_csv(path)
        return self._process(df)

    def load_from_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        return self._process(df)

    def load_from_json(self, data: list[dict]) -> pd.DataFrame:
        return self._process(pd.DataFrame(data))

    def get_column_mapping(self, df: pd.DataFrame) -> dict:
        """Return detected mappings and generated fields for the upload preview."""
        rename_map = self._build_rename_map(df)
        detected = {original: mapped for original, mapped in rename_map.items()}
        missing = []
        mapped_values = set(rename_map.values())
        for col in REQUIRED_COLS:
            if col not in mapped_values and col not in df.columns:
                if col == "store_id":
                    missing.append({"column": col, "action": "auto-generated as STORE_001"})
                elif col == "product_id":
                    missing.append({"column": col, "action": "auto-generated from product-like fields or default"})
                elif col == "units_sold":
                    missing.append({"column": col, "action": "auto-mapped from a numeric sales-like column when possible"})
                else:
                    missing.append({"column": col, "action": "required but not found"})
        return {"mapped": detected, "missing": missing}

    def _process(self, df: pd.DataFrame) -> pd.DataFrame:
        df = self._normalize_columns(df)
        df = self._auto_generate_missing(df)
        self._validate(df)
        return self._clean(df)

    def _build_rename_map(self, df: pd.DataFrame) -> dict:
        rename_map = {}
        used_columns = set()
        for standard_name, aliases in COLUMN_ALIASES.items():
            if standard_name in df.columns:
                continue
            for alias in aliases:
                if alias in df.columns and alias not in used_columns:
                    rename_map[alias] = standard_name
                    used_columns.add(alias)
                    break
        return rename_map

    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        rename_map = self._build_rename_map(df)
        if rename_map:
            logger.info("Remapped columns: %s", rename_map)
            df = df.rename(columns=rename_map)

        col_lower = {c.lower().strip().replace(" ", "_"): c for c in df.columns}
        for standard_name in REQUIRED_COLS:
            if standard_name not in df.columns and standard_name in col_lower:
                df = df.rename(columns={col_lower[standard_name]: standard_name})

        return df

    def _auto_generate_missing(self, df: pd.DataFrame) -> pd.DataFrame:
        """Auto-generate store_id/product_id and infer demand if possible."""
        if "store_id" not in df.columns:
            df["store_id"] = "STORE_001"
            logger.info("store_id not found; auto-generated as STORE_001")

        if "product_id" not in df.columns:
            for candidate in ["category", "description", "name", "item", "sku"]:
                if candidate in df.columns:
                    df["product_id"] = (
                        df[candidate].astype(str).str.upper().str.replace(" ", "_", regex=False)
                    )
                    logger.info("product_id auto-generated from column: %s", candidate)
                    break
            else:
                df["product_id"] = "PRODUCT_001"
                logger.info("product_id not found; auto-generated as PRODUCT_001")

        if "units_sold" not in df.columns:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            date_like = {"date", "year", "month", "week", "day"}
            candidates = [c for c in numeric_cols if c.lower() not in date_like]
            if candidates:
                df["units_sold"] = df[candidates[0]]
                logger.info("units_sold auto-mapped from column: %s", candidates[0])

        return df

    def _validate(self, df: pd.DataFrame) -> None:
        missing = REQUIRED_COLS - set(df.columns)
        if missing:
            raise ValueError(
                f"Could not find or generate required columns: {missing}. "
                f"Your data has: {list(df.columns)}. "
                "Required: date, store_id, product_id, units_sold"
            )

    def _clean(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])
        df["units_sold"] = pd.to_numeric(df["units_sold"], errors="coerce").fillna(0).clip(lower=0)
        df["store_id"] = df["store_id"].astype(str).str.strip()
        df["product_id"] = df["product_id"].astype(str).str.strip()

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

        df.columns = [c.lower().replace(" ", "_") for c in df.columns]
        df = df.loc[:, ~df.columns.duplicated()]
        df = df.sort_values(["store_id", "product_id", "date"]).reset_index(drop=True)
        df = ExternalFactorsService.enrich_data(df)

        logger.info(
            "Loaded %d rows | %d stores | %d products after enrichment",
            len(df),
            df["store_id"].nunique(),
            df["product_id"].nunique(),
        )
        return df

    def filter_product(self, df: pd.DataFrame, store_id: str, product_id: str) -> pd.DataFrame:
        mask = (df["store_id"].astype(str) == str(store_id)) & (
            df["product_id"].astype(str) == str(product_id)
        )
        result = df[mask].copy()
        if result.empty:
            raise ValueError(f"No data for store={store_id}, product={product_id}")
        return result
