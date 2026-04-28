import sys
import pickle
from pathlib import Path

# Fix paths
BASE = Path(__file__).parent.parent
sys.path.insert(0, str(BASE / "backend"))

from app.pipeline.preprocessor import DataPreprocessor
from app.pipeline.xgboost_forecaster import XGBoostForecaster

# Use sample data since large CSV is gitignored
DATA_PATH = BASE / "data" / "sample_inventory.csv"
if not DATA_PATH.exists():
    DATA_PATH = BASE / "data" / "retail_store_inventory.csv"

MODELS_DIR = BASE / "backend" / "models"
MODELS_DIR.mkdir(exist_ok=True)

print(f"Loading data from: {DATA_PATH}")
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
                print(f"  Skipping {store}+{product} — only {len(product_df)} rows")
                continue
            forecaster = XGBoostForecaster()
            forecaster.train(product_df)
            model_path = MODELS_DIR / f"{store}__{product}.pkl"
            with open(model_path, "wb") as f:
                pickle.dump(forecaster, f)
            trained += 1
            print(f"  Trained {store}+{product} ({len(product_df)} rows)")
        except Exception as e:
            print(f"  Skipped {store}+{product}: {e}")

print(f"\nDone! {trained} models saved to {MODELS_DIR}")
