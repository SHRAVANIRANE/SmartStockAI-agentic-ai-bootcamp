import { useEffect, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Play, ShieldAlert, SlidersHorizontal } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

interface ForecastPoint {
  date: string;
  predicted_units: number;
}

interface InventoryRisk {
  overstock_risk: boolean;
  understock_risk: boolean;
  stockout_prediction_days: number | null;
  risk_insight: string;
}

interface SimulationResponse {
  store_id: string;
  product_id: string;
  baseline_forecast: ForecastPoint[];
  simulated_forecast: ForecastPoint[];
  baseline_risk: InventoryRisk;
  simulated_risk: InventoryRisk;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        boxShadow: "var(--shadow)",
      }}
    >
      <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}:{" "}
          <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function SimulationDashboard({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [priceChange, setPriceChange] = useState(0);
  const [discountChange, setDiscountChange] = useState(0);
  const [isPromotion, setIsPromotion] = useState(false);
  const [isFestival, setIsFestival] = useState(false);
  const [supplierDelay, setSupplierDelay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimulationResponse | null>(null);

  const horizon = 30;

  const runSimulation = () => {
    setLoading(true);
    fetch(`${API}/forecast/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        product_id: productId,
        current_inventory: 100,
        price_change_pct: priceChange,
        discount_change_pct: discountChange,
        is_promotion: isPromotion,
        is_festival: isFestival,
        supplier_delay_days: supplierDelay,
        horizon_days: horizon,
      }),
    })
      .then((r) => r.json())
      .then((res) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runSimulation();
  }, [storeId, productId]);

  const chartData =
    data?.baseline_forecast.map((baseline, i) => {
      const simulated = data.simulated_forecast[i];
      return {
        date: baseline.date.slice(5),
        Baseline: baseline.predicted_units,
        Simulated: simulated?.predicted_units || 0,
      };
    }) || [];

  return (
    <div className="simulation-stack">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <SlidersHorizontal size={17} strokeWidth={2.1} />
              Simulation Parameters
            </h3>
            <p className="card-subtitle">
              Model a 30-day demand response for {storeId} / {productId}
            </p>
          </div>
        </div>

        <div className="simulation-controls">
          <div className="range-field">
            <label htmlFor="price-change">
              Price change ({priceChange > 0 ? "+" : ""}
              {priceChange}%)
            </label>
            <input
              id="price-change"
              type="range"
              min="-50"
              max="50"
              step="5"
              value={priceChange}
              onChange={(e) => setPriceChange(Number(e.target.value))}
            />
          </div>
          <div className="range-field">
            <label htmlFor="discount-change">Additional discount (+{discountChange}%)</label>
            <input
              id="discount-change"
              type="range"
              min="0"
              max="50"
              step="5"
              value={discountChange}
              onChange={(e) => setDiscountChange(Number(e.target.value))}
            />
          </div>
          <div className="range-field">
            <label htmlFor="supplier-delay">Supplier delay ({supplierDelay} days)</label>
            <input
              id="supplier-delay"
              type="range"
              min="0"
              max="30"
              step="1"
              value={supplierDelay}
              onChange={(e) => setSupplierDelay(Number(e.target.value))}
            />
          </div>

          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isPromotion}
                onChange={(e) => setIsPromotion(e.target.checked)}
              />
              Marketing promotion active
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isFestival}
                onChange={(e) => setIsFestival(e.target.checked)}
              />
              Festival season
            </label>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
              <Play size={16} strokeWidth={2.2} />
              {loading ? "Simulating..." : "Run simulation"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Demand Comparison</h3>
            <p className="card-subtitle">Baseline vs simulated forecast over 30 days</p>
          </div>
        </div>
        {loading && !data ? (
          <div className="center-state" style={{ minHeight: 260 }}>
            Running simulation...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="Baseline"
                stroke="var(--text-muted)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Simulated"
                stroke="var(--accent-purple)"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {data && (
        <div className="risk-comparison-grid">
          <div className="card border-top-muted">
            <h3 className="card-title" style={{ marginBottom: 10 }}>
              <ShieldAlert size={17} strokeWidth={2.1} />
              Baseline Risk
            </h3>
            <div className="muted-text">
              <p>
                <strong>Stockout prediction:</strong>{" "}
                {data.baseline_risk.stockout_prediction_days
                  ? `${data.baseline_risk.stockout_prediction_days} days`
                  : "No stockout expected"}
              </p>
              <p style={{ marginTop: 8 }}>
                <strong>Insight:</strong> {data.baseline_risk.risk_insight}
              </p>
            </div>
          </div>
          <div className="card border-top-purple">
            <h3 className="card-title" style={{ marginBottom: 10 }}>
              <ShieldAlert size={17} strokeWidth={2.1} />
              Simulated Risk
            </h3>
            <div className="muted-text">
              <p>
                <strong>Stockout prediction:</strong>{" "}
                {data.simulated_risk.stockout_prediction_days
                  ? `${data.simulated_risk.stockout_prediction_days} days`
                  : "No stockout expected"}
              </p>
              <p style={{ marginTop: 8 }}>
                <strong>Insight:</strong> {data.simulated_risk.risk_insight}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
