import pandas as pd
import numpy as np
import holidays
from datetime import date
from app.core.logging import get_logger

logger = get_logger(__name__)

class ExternalFactorsService:
    """
    Dynamically injects external factors into the dataframe to ensure the XGBoost model 
    always has rich environmental context, even if the raw data is missing it.
    """
    
    @staticmethod
    def enrich_data(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        # 1. Holidays & Festivals
        # We use US holidays as a baseline. For a global app, this could be configurable.
        us_holidays = holidays.US()
        
        def check_holiday(d):
            try:
                # holidays package allows checking if a date object is a holiday
                if d in us_holidays:
                    return 1
                return 0
            except:
                return 0

        # Create 'is_promotion' / holiday column if missing or just overwrite to guarantee accuracy
        if "is_promotion" not in df.columns or df["is_promotion"].sum() == 0:
            logger.info("Enriching data with real-world holidays...")
            df["is_promotion"] = df["date"].dt.date.apply(check_holiday)
        
        # 2. Weather Simulation (Deterministic based on month)
        # Since we are avoiding external API keys, we simulate realistic weather.
        def simulate_weather(d: date):
            month = d.month
            day = d.day
            # Deterministic hash to keep the weather the same for the same date across runs
            h = (month * 31 + day) % 100 
            
            if month in [12, 1, 2]:
                if h < 20: return "Snowy"
                if h < 50: return "Cloudy"
                return "Cold"
            elif month in [3, 4, 5]:
                if h < 40: return "Rainy"
                if h < 70: return "Cloudy"
                return "Sunny"
            elif month in [6, 7, 8]:
                if h < 20: return "Rainy"
                if h < 50: return "Hot"
                return "Sunny"
            else:
                if h < 30: return "Windy"
                if h < 60: return "Cloudy"
                return "Clear"

        if "weather_condition" not in df.columns or df["weather_condition"].nunique() <= 1:
            logger.info("Enriching data with simulated seasonal weather...")
            df["weather_condition"] = df["date"].dt.date.apply(simulate_weather)
            
        # 3. Competitor Pricing Simulation
        # Simulate competitor undercutting price occasionally
        if "competitor_price" not in df.columns or df["competitor_price"].sum() == 0:
            if "price" in df.columns:
                logger.info("Enriching data with simulated competitor pricing...")
                np.random.seed(42) # Deterministic
                # Competitor usually matches price, but sometimes undercuts by 5-15%
                undercut_chance = np.random.random(len(df))
                undercut_amount = np.random.uniform(0.85, 0.95, len(df))
                
                df["competitor_price"] = df["price"]
                mask = undercut_chance < 0.15  # 15% of the time they undercut
                df.loc[mask, "competitor_price"] = df.loc[mask, "price"] * undercut_amount[mask]
        
        return df

    @staticmethod
    def get_upcoming_factors(start_date: date, days: int = 7) -> list[dict]:
        dates = [start_date + pd.Timedelta(days=i) for i in range(days)]
        df = pd.DataFrame({"date": dates})
        df["date"] = pd.to_datetime(df["date"])
        df["price"] = 100 # dummy price for competitor logic
        
        df = ExternalFactorsService.enrich_data(df)
        
        result = []
        for _, row in df.iterrows():
            result.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "weather": row["weather_condition"],
                "is_holiday": bool(row["is_promotion"]),
                "competitor_undercut": bool(row.get("competitor_price", 100) < row["price"])
            })
        return result
