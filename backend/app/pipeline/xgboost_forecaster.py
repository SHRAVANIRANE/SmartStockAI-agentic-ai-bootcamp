import numpy as np
import pandas as pd
import xgboost as xgb
from dataclasses import dataclass, field
from app.pipeline.feature_engineer import FeatureEngineer
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ForecastResult:
    dates: list
    predictions: list[float]
    lower_bounds: list[float]
    upper_bounds: list[float]
    shap_values: dict = field(default_factory=dict)   # feature -> mean |SHAP|


class XGBoostForecaster:
    """
    Trains an XGBoost model per (store, product) and generates
    multi-step ahead forecasts with SHAP-based feature importance.
    """

    def __init__(self):
        self.model: xgb.XGBRegressor | None = None
        self.feature_engineer = FeatureEngineer()
        self.feature_cols: list[str] = []

    def train(self, df: pd.DataFrame) -> None:
        featured = self.feature_engineer.build(df)
        self.feature_cols = self.feature_engineer.get_feature_columns()

        X = featured[self.feature_cols]
        y = featured["units_sold"]

        # Time-based split — no data leakage
        split = int(len(X) * 0.8)
        X_train, X_val = X.iloc[:split], X.iloc[split:]
        y_train, y_val = y.iloc[:split], y.iloc[split:]

        self.model = xgb.XGBRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            early_stopping_rounds=20,
            eval_metric="rmse",
            random_state=42,
        )
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
        logger.info("XGBoost trained | best_iteration=%d", self.model.best_iteration)

    def forecast(self, df: pd.DataFrame, horizon_days: int, simulation_params: dict | None = None) -> ForecastResult:
        if self.model is None:
            raise RuntimeError("Model not trained. Call train() first.")

        featured = self.feature_engineer.build(df)
        last_row = featured.iloc[-1].copy()
        history = list(featured["units_sold"].values)

        predictions, dates = [], []
        last_date = df["date"].max()

        for step in range(horizon_days):
            next_date = last_date + pd.Timedelta(days=step + 1)
            row = self._build_future_row(last_row, history, next_date, step, simulation_params)
            X_pred = pd.DataFrame([row])[self.feature_cols]
            pred = float(self.model.predict(X_pred)[0])
            pred = max(0.0, pred)
            predictions.append(pred)
            dates.append(next_date)
            history.append(pred)

        std = np.std(predictions) if len(predictions) > 1 else 0.0
        lower = [max(0.0, p - 1.96 * std) for p in predictions]
        upper = [p + 1.96 * std for p in predictions]

        shap_importance = self._compute_shap(featured)
        return ForecastResult(dates, predictions, lower, upper, shap_importance)

    def _build_future_row(
        self, base_row: pd.Series, history: list, date: pd.Timestamp, step: int, simulation_params: dict | None = None
    ) -> dict:
        row = base_row.to_dict()
        row["day_of_week"] = date.dayofweek
        row["month"] = date.month
        row["week_of_year"] = date.isocalendar()[1]
        row["quarter"] = date.quarter
        row["is_weekend"] = int(date.dayofweek >= 5)

        if simulation_params:
            if simulation_params.get("is_promotion"):
                row["is_promotion"] = 1
            if simulation_params.get("is_festival"):
                row["is_promotion"] = 1  # Often maps to similar impact
            
            price = row.get("price", 100)
            discount = row.get("discount", 0)
            
            if simulation_params.get("price_change_pct"):
                price = price * (1 + simulation_params["price_change_pct"] / 100)
            if simulation_params.get("discount_change_pct"):
                discount = max(0, discount * (1 + simulation_params["discount_change_pct"] / 100))
                
            row["price_discount_ratio"] = discount / (price + 1e-6)
            row["price_vs_competitor"] = price / (row.get("competitor_price", price) + 1e-6)

        for lag in self.feature_engineer.LAG_DAYS:
            idx = -(lag - step) if (lag - step) > 0 else -1
            row[f"lag_{lag}d"] = history[idx] if abs(idx) <= len(history) else 0.0

        for window in self.feature_engineer.ROLLING_WINDOWS:
            recent = history[-window:] if len(history) >= window else history
            row[f"rolling_mean_{window}d"] = float(np.mean(recent))
            row[f"rolling_std_{window}d"] = float(np.std(recent))

        return row

    def _compute_shap(self, featured: pd.DataFrame) -> dict[str, float]:
        # Use XGBoost native feature importance (avoids SHAP segfault on Python 3.13)
        importance = self.model.feature_importances_
        return dict(zip(self.feature_cols, importance.tolist()))
