# SmartStock AI - Inventory Demand Forecasting Agent

A production-grade AI system that forecasts retail inventory demand, recommends optimal reorder quantities, and explains decisions in plain English using a Gemma 3 language model.

Built with XGBoost for demand forecasting, LangChain for LLM workflows, FastAPI for the backend API, and React for the dashboard.

---

## What It Does

- Reads historical sales data from CSV, with CSV and JSON uploads supported from the dashboard
- Trains an XGBoost model per store/product combination automatically on first request
- Forecasts demand for the next 7 to 60 days with confidence intervals
- Calculates reorder point, safety stock, and recommended order quantity
- Explains trends and reorder decisions in plain English using Gemma 3 via Google AI API
- Provides a conversational AI chat interface grounded in real forecast data
- Generates purchase-order PDFs from reorder recommendations
- Runs what-if simulations for price, discount, promotion, festival, and supplier-delay scenarios

## New Features

- **KPI Summary Cards**: Real-time insights into total demand, reorder alerts, stock risk, and forecast accuracy.
- **Inventory Risk Detection**: Predicts stockout dates and flags overstock or understock scenarios.
- **Seasonal Demand Patterns**: Shows weekly rhythms and monthly seasonality with interactive charts.
- **External Factors**: Adds upcoming weather, holiday, and competitor-pricing signals.
- **What-If Simulation**: Compares baseline and simulated demand under operational changes.
- **Purchase Orders**: Generates purchase-order PDFs from reorder recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Forecasting | XGBoost + feature engineering |
| LLM | Gemma 3 via Google Generative AI API |
| LLM Workflow | LangChain |
| Backend | FastAPI + Uvicorn |
| Frontend | React + Vite + TypeScript + Recharts |
| Data Processing | Pandas + NumPy |

---

## Project Structure

```text
inventory-demand-forecasting-shap/
|-- backend/
|   |-- app/
|   |   |-- api/routes/        # forecast, reorder, chat, data endpoints
|   |   |-- core/              # config, logging
|   |   |-- models/            # Pydantic schemas
|   |   |-- pipeline/          # preprocessor, feature engineer, XGBoost
|   |   `-- services/          # forecasting, reorder, LLM, data services
|   |-- models/                # saved .pkl model files (gitignored)
|   |-- tests/
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- components/        # dashboard widgets and charts
|   |   `-- pages/             # Dashboard
|   `-- package.json
|-- data/
|   `-- sample_inventory.csv
|-- scripts/
|   `-- pretrain_models.py
`-- notebooks/
    `-- inventory_forecasting.ipynb
```

---

## Prerequisites

- Python 3.11
- Node.js 18+
- A Google AI API key from https://aistudio.google.com/app/apikey
- conda or virtualenv

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/SHRAVANIRANE/agentic-ai-bootcamp.git
cd agentic-ai-bootcamp
```

### 2. Create and activate a Python environment

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

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemma-3-1b-it
```

### 5. Start the backend

```bash
cd backend
PYTHONPATH=. python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend API docs run at http://localhost:8000/docs.

### 6. Install and start the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

The frontend runs at http://localhost:3000.

---

## Sample Data Format

CSV files should include at least these columns:

```csv
date,store_id,product_id,units_sold
2024-01-01,S001,P0001,150
2024-01-02,S001,P0001,133
```

Optional columns improve forecast quality:

```text
inventory_level, price, discount, weather_condition, is_promotion,
competitor_price, seasonality, category, region
```

JSON uploads are also supported from the dashboard:

```json
[
  {
    "date": "2024-01-01",
    "store_id": "S001",
    "product_id": "P0001",
    "units_sold": 150,
    "price": 161.48,
    "discount": 20
  }
]
```

Recommended data volume:

- 50 rows per product: works, but accuracy is limited
- 100 to 365 rows per product: good accuracy
- 365+ rows per product: best for seasonality

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/forecast/` | Get demand forecast |
| POST | `/api/v1/forecast/simulate` | Run what-if forecast simulation |
| GET | `/api/v1/forecast/stores` | List all stores |
| GET | `/api/v1/forecast/products?store_id=S001` | List products for a store |
| GET | `/api/v1/forecast/trends` | Get trend explanation |
| POST | `/api/v1/forecast/kpi_risk` | Get KPI metrics and inventory risk profile |
| GET | `/api/v1/forecast/pattern` | Get weekly and monthly seasonal demand patterns |
| GET | `/api/v1/forecast/external_factors` | Get upcoming external factor signals |
| POST | `/api/v1/reorder/` | Get reorder recommendation |
| POST | `/api/v1/reorder/generate_po` | Generate a purchase-order PDF |
| POST | `/api/v1/chat/` | Chat with the AI inventory assistant |
| POST | `/api/v1/data/upload` | Upload CSV or JSON file |
| POST | `/api/v1/data/reset` | Reset to default dataset |
| GET | `/api/v1/data/info` | Get current dataset info |

Full interactive docs are available at http://localhost:8000/docs.

---

## How the Model Trains

No manual training step is needed. The system trains automatically:

1. You hit any forecast or reorder endpoint for the first time.
2. The system loads the active CSV or uploaded JSON data.
3. Feature engineering builds lag, rolling, calendar, price, promotion, and external-factor features.
4. XGBoost trains with a time-based split to avoid data leakage.
5. The model is cached in memory for future requests.
6. Each store/product combination gets its own model.

First request per product can take a few seconds. Subsequent requests use the cached model.

---

## Uploading Your Own Data

1. Open the dashboard at http://localhost:3000.
2. Click the **Data** tab.
3. Upload a CSV or JSON file.
4. The system retrains automatically on your data.
5. Store and product dropdowns update to show your uploaded data.

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## License

MIT
