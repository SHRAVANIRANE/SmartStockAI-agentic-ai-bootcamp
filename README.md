# Inventory Demand Forecasting Agent

An AI-assisted retail inventory system that forecasts demand, recommends reorder quantities, and explains decisions in plain English using Llama 3 via Ollama.

## Architecture

```text
CSV data
  -> DataPreprocessor
  -> FeatureEngineer
  -> XGBoostForecaster
  -> ForecastingService
  -> LLMService
  -> FastAPI REST API
  -> React dashboard
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| ML forecasting | XGBoost |
| LLM reasoning | Llama 3 via Ollama |
| Agent orchestration | LangChain ReAct Agent |
| Backend API | FastAPI + Uvicorn |
| Frontend | React + Vite + Recharts |
| Data processing | Pandas + NumPy |

## Project Structure

```text
backend/
  app/
    api/routes/       forecast, reorder, agent endpoints
    agents/           LangChain agent and tools
    core/             config and logging
    models/           Pydantic schemas
    pipeline/         preprocessing, feature engineering, XGBoost
    services/         data, forecasting, reorder, LLM services
  tests/
  requirements.txt
frontend/
  src/
    components/
    pages/
data/
  retail_store_inventory.csv
docker-compose.yml
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- Ollama installed and running
- Llama model: `llama3:8b-instruct-q4_0`

## Run Locally On Windows PowerShell

Run these commands from the project root.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start Ollama. Keep this terminal open, or skip this command if Ollama is already running:

```powershell
ollama serve
```

In another terminal, pull the model:

```powershell
ollama pull llama3:8b-instruct-q4_0
```

Start the backend in a new PowerShell terminal:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend:

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

Start the frontend in another terminal:

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:8000/api/v1"
npm start
```

Frontend: `http://localhost:3000`

Use `S001` and `P0001` as the first sample store/product pair.

## Run Locally On macOS / Linux

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
ollama pull llama3:8b-instruct-q4_0
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal:

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000/api/v1 npm start
```

## API Endpoints

Forecast demand:

```http
POST /api/v1/forecast/
```

```json
{
  "store_id": "S001",
  "product_id": "P0001",
  "horizon_days": 7
}
```

Reorder recommendation:

```http
POST /api/v1/reorder/
```

```json
{
  "store_id": "S001",
  "product_id": "P0001",
  "current_inventory": 100,
  "lead_time_days": 7
}
```

AI agent chat:

```http
POST /api/v1/agent/chat
```

```json
{
  "message": "Should I reorder P0001 at S001 if I have 50 units left?",
  "store_id": "S001",
  "product_id": "P0001"
}
```

Trend explanation:

```http
GET /api/v1/forecast/trends?store_id=S001&product_id=P0001
```

## Docker

```bash
docker compose up --build
```

Services:

- Backend API: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- Ollama: `http://localhost:11434`
- Redis: `localhost:6379`

After the Ollama container starts, pull the model into it:

```bash
docker compose exec ollama ollama pull llama3:8b-instruct-q4_0
```

## Tests

```bash
cd backend
pytest tests/ -v
```
