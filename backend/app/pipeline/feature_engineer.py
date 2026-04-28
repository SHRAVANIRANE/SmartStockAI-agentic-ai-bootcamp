import pandas as pd
import numpy as np


class FeatureEngineer:
    """
    Builds ML-ready features from cleaned inventory data.
    Adapts to whatever columns exist — works with any dataset.
    """

    LAG_DAYS = [7, 14, 21, 28]
    ROLLING_WINDOWS = [7, 14, 28]

    def build(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy().sort_values("date").reset_index(drop=True)

        # Calendar features — always available from date
        df["day_of_week"] = df["date"].dt.dayofweek
        df["month"] = df["date"].dt.month
        df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
        df["quarter"] = df["date"].dt.quarter
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

        # Lag features — always built from units_sold
        for lag in self.LAG_DAYS:
            df[f"lag_{lag}d"] = df["units_sold"].shift(lag)

        # Rolling statistics
        for window in self.ROLLING_WINDOWS:
            df[f"rolling_mean_{window}d"] = df["units_sold"].shift(1).rolling(window).mean()
            df[f"rolling_std_{window}d"] = df["units_sold"].shift(1).rolling(window).std()

        # Optional features — only if columns exist
        if "price" in df.columns and df["price"].sum() > 0:
            discount = df["discount"] if "discount" in df.columns else 0
            competitor = df["competitor_price"] if "competitor_price" in df.columns else df["price"]
            df["price_discount_ratio"] = discount / (df["price"] + 1e-6)
            df["price_vs_competitor"] = df["price"] / (competitor + 1e-6)
        else:
            df["price_discount_ratio"] = 0.0
            df["price_vs_competitor"] = 1.0

        if "is_promotion" in df.columns:
            df["is_promotion"] = pd.to_numeric(df["is_promotion"], errors="coerce").fillna(0)
        else:
            df["is_promotion"] = 0

        if "weather_condition" in df.columns and df["weather_condition"].nunique(dropna=True) > 1:
            df["weather_encoded"] = df["weather_condition"].astype("category").cat.codes
        else:
            df["weather_encoded"] = 0

        if "seasonality" in df.columns and df["seasonality"].nunique(dropna=True) > 1:
            df["seasonality_encoded"] = df["seasonality"].astype("category").cat.codes
        else:
            # Derive seasonality from month if not provided
            df["seasonality_encoded"] = df["month"].apply(
                lambda m: 0 if m in [12, 1, 2] else 1 if m in [3, 4, 5] else 2 if m in [6, 7, 8] else 3
            )

        df = df.dropna(subset=self.get_feature_columns())
        return df

    def get_feature_columns(self) -> list[str]:
        lag_cols = [f"lag_{d}d" for d in self.LAG_DAYS]
        rolling_cols = [
            f"rolling_{stat}_{w}d"
            for stat in ["mean", "std"]
            for w in self.ROLLING_WINDOWS
        ]
        return [
            "day_of_week", "month", "week_of_year", "quarter", "is_weekend",
            "is_promotion", "price_discount_ratio", "price_vs_competitor",
            "weather_encoded", "seasonality_encoded",
            *lag_cols, *rolling_cols,
        ]
