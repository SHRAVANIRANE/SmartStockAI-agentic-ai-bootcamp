"""
Run this locally before deploying to Render.
Trains XGBoost models for all store+product combinations
and saves them to disk so Render doesn't need to train on startup.
"""
import sys
import pickle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.pipeline.preprocessor import DataPreprocessor
from app.pipeline.xgboost_forecaster import XGBoostForecaster

DATA_PATH = Path("data/retail_store_inventory.csv")
MODELS_DIR = Path("backend/models")
MODELS_DIR.mkdir(exist_ok=True)

prep = DataPreprocessor()
df = prep.load(DATA_PATH)

stores = df["store_id"].unique()
products = df["product_id"].unique()

trained = 0
for store in stores:
    for product in products:
        try:
            product_df = prep.filter_product(df, store, product)
            if len(product_df) < 50:
                continue
            forecaster = XGBoostForecaster()
            forecaster.train(product_df)
            model_path = MODELS_DIR / f"{store}__{product}.pkl"
            with open(model_path, "wb") as f:
                pickle.dump(forecaster, f)
            trained += 1
            print(f"✅ Trained {store}+{product} ({len(product_df)} rows)")
        except Exception as e:
            print(f"❌ Skipped {store}+{product}: {e}")

print(f"\nDone! Trained {trained} models saved to {MODELS_DIR}")
