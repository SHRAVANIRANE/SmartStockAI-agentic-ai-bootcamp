# Inventory Demand Forecasting Agent

A production-grade AI system that forecasts retail inventory demand, recommends optimal reorder quantities, and explains decisions in plain English using a Gemma 3 language model.

Built with XGBoost for demand forecasting, LangChain for agent orchestration, FastAPI for the backend API, and React for the dashboard.

---

## What It Does

- Reads historical sales data (CSV or JSON)
- Trains an XGBoost model per store/product combination automatically on first request
- Forecasts demand for the next 7 to 60 days with confidence intervals
- Calculates reorder point, safety stock, and recommended order quantity using industry-standard supply chain formulas
- Explains trends and reorder decisions in plain English using Gemma 3 via Google AI API
- Provides a conversational AI chat interface grounded in real forecast data
- Supports uploading your own CSV or JSON data to retrain on company-specific inventory

### New Features 
- **KPI Summary Cards**: Real-time insights into Total Demand, Reorder Alerts, Stock Risk, and Forecast Accuracy.
- **Intelligent Inventory Risk Detection**: Automatically predicts stockout dates and flags overstock/understock scenarios with actionable AI insights.
- **Seasonal Demand Pattern Visualization**: Interactive Recharts components displaying weekly rhythms and monthly macro-seasonality.
- **Glassmorphic Dashboard UI**: A premium dark-mode aesthetic with dynamic hover effects, status badges, and prioritized reorder alerts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Forecasting | XGBoost + feature engineering (lag, rolling, calendar) |
| LLM | Gemma 3 via Google Generative AI API |
| Agent Orchestration | LangChain |
| Backend | FastAPI + Uvicorn |
| Frontend | React + Vite + TypeScript + Recharts |
| Data Processing | Pandas + NumPy |

---

## Project Structure

```
inventory-demand-forecasting-shap/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # forecast, reorder, chat, data
│   │   ├── core/                # config, logging
│   │   ├── models/              # Pydantic schemas
│   │   ├── pipeline/            # preprocessor, feature engineer, XGBoost
│   │   └── services/            # forecasting, reorder, LLM, data services
│   ├── models/                  # saved .pkl model files (gitignored)
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/          # ForecastChart, ReorderTable, AgentChat, DataUpload
│       └── pages/               # Dashboard
├── data/
│   ├── sample_inventory.csv     # sample dataset (3 stores, 4 products, 1 year)
│   └── sample_inventory.json    # sample dataset in JSON format (500 rows)
├── scripts/
│   └── pretrain_models.py
├── notebooks/
│   └── inventory_forecasting.ipynb
└── docker-compose.yml
```

---

## Prerequisites

- Python 3.11
- Node.js 18+
- A Google AI API key (free at https://aistudio.google.com/app/apikey)
- conda (recommended) or virtualenv

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/SHRAVANIRANE/agentic-ai-bootcamp.git
cd agentic-ai-bootcamp
```

### 2. Create and activate Python environment

```bash
conda create -n inventory-agent python=3.11 -y
conda activate inventory-agent
```

### 3. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

On macOS, XGBoost requires OpenMP:
```bash
brew install libomp
```

### 4. Add your Gemini API key

Create a `.env` file inside the `backend/` folder:
```
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemma-3-1b-it
```

### 5. Add sample data

The repo includes sample datasets in `data/`. You can use either:
- `data/sample_inventory.csv` — 4,380 rows, 3 stores, 4 products, 1 year
- `data/sample_inventory.json` — 500 rows in JSON format

### 6. Start the backend

```bash
cd backend
PYTHONPATH=. python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

You should see:
```
Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

### 7. Install and start the frontend

Open a new terminal:
```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000
API docs at: http://localhost:8000/docs

---

## Sample Data Format

### CSV format

```csv
Date,Store ID,Product ID,Category,Region,Inventory Level,Units Sold,Units Ordered,Demand Forecast,Price,Discount,Weather Condition,Holiday/Promotion,Competitor Pricing,Seasonality
2023-01-01,S001,P0001,Electronics,North,264,150,74,148.78,161.48,20,Snowy,0,147.64,Winter
2023-01-02,S001,P0001,Electronics,North,393,133,157,125.35,155.16,15,Sunny,0,159.53,Winter
```

### JSON format

```json
[
  {
    "date": "2023-01-01",
    "store_id": "S001",
    "product_id": "P0001",
    "units_sold": 150,
    "price": 161.48,
    "discount": 20,
    "inventory_level": 264,
    "is_promotion": 0,
    "weather_condition": "Snowy",
    "competitor_price": 147.64,
    "seasonality": "Winter",
    "category": "Electronics",
    "region": "North"
  }
]
```

### Minimum required columns

Only these 4 columns are required. All others are optional and improve forecast accuracy:

```
date, store_id, product_id, units_sold
```

### Minimum rows needed

- 50 rows per product — works but low accuracy
- 100 to 365 rows per product — good accuracy
- 365+ rows per product — best, captures full seasonality

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/forecast/` | Get demand forecast |
| GET | `/api/v1/forecast/stores` | List all stores |
| GET | `/api/v1/forecast/products?store_id=S001` | List products for a store |
| GET | `/api/v1/forecast/trends` | Get trend explanation |
| POST | `/api/v1/forecast/kpi_risk` | Get KPI metrics and inventory risk profile |
| GET | `/api/v1/forecast/pattern` | Get weekly and monthly seasonal demand patterns |
| POST | `/api/v1/reorder/` | Get reorder recommendation |
| POST | `/api/v1/chat/` | Chat with AI agent |
| POST | `/api/v1/data/upload` | Upload CSV or JSON file |
| POST | `/api/v1/data/reset` | Reset to default dataset |
| GET | `/api/v1/data/info` | Get current dataset info |

Full interactive docs at: http://localhost:8000/docs

---

## How the Model Trains

No manual training step is needed. The system trains automatically:

1. You hit any forecast or reorder endpoint for the first time
2. The system loads your CSV/JSON data
3. Builds 20 features: lag (7/14/21/28 days), rolling averages, calendar, price, promotions, weather
4. Splits data 80/20 by time (no data leakage)
5. Trains XGBoost with early stopping
6. Caches the model in memory for all future requests
7. Each store + product combination gets its own model

First request per product takes 3 to 5 seconds. All subsequent requests are instant.

---

## Uploading Your Own Data

1. Open the dashboard at http://localhost:3000
2. Click the **Data** tab
3. Upload your CSV or JSON file
4. The system retrains automatically on your data
5. Store and product dropdowns update to show your data

---

## License

MIT
