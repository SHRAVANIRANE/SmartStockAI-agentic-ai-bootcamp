import { useState, useEffect } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function SimulationDashboard({ storeId, productId }: { storeId: string; productId: string }) {
  const [priceChange, setPriceChange] = useState(0);
  const [discountChange, setDiscountChange] = useState(0);
  const [isPromotion, setIsPromotion] = useState(false);
  const [isFestival, setIsFestival] = useState(false);
  const [supplierDelay, setSupplierDelay] = useState(0);
  const [horizon] = useState(30);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimulationResponse | null>(null);

  const runSimulation = () => {
    setLoading(true);
    fetch(`${API}/forecast/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        product_id: productId,
        current_inventory: 100, // Hardcoded for simulation demo
        price_change_pct: priceChange,
        discount_change_pct: discountChange,
        is_promotion: isPromotion,
        is_festival: isFestival,
        supplier_delay_days: supplierDelay,
        horizon_days: horizon
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

  const chartData = data?.baseline_forecast.map((b, i) => {
    const s = data.simulated_forecast[i];
    return {
      date: b.date.slice(5),
      Baseline: b.predicted_units,
      Simulated: s?.predicted_units || 0
    };
  }) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Simulation Parameters</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "center" }}>
          {/* Price Change */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              Price Change ({priceChange > 0 ? "+" : ""}{priceChange}%)
            </label>
            <input type="range" min="-50" max="50" step="5" value={priceChange} onChange={(e) => setPriceChange(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          {/* Discount Change */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              Additional Discount (+{discountChange}%)
            </label>
            <input type="range" min="0" max="50" step="5" value={discountChange} onChange={(e) => setDiscountChange(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          {/* Supplier Delay */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              Supplier Delay ({supplierDelay} days)
            </label>
            <input type="range" min="0" max="30" step="1" value={supplierDelay} onChange={(e) => setSupplierDelay(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          
          {/* Toggles */}
          <div style={{ display: "flex", gap: 16, gridColumn: "span 3" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--text-primary)" }}>
              <input type="checkbox" checked={isPromotion} onChange={(e) => setIsPromotion(e.target.checked)} />
              Marketing Promotion Active
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--text-primary)" }}>
              <input type="checkbox" checked={isFestival} onChange={(e) => setIsFestival(e.target.checked)} />
              Festival Season (High Traffic)
            </label>
            <div style={{ flex: 1 }}></div>
            <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
              {loading ? "Simulating..." : "Run Simulation"}
            </button>
          </div>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Demand Comparison (30 Days)</h3>
          {loading && !data ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Running simulation...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Baseline" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="Simulated" stroke="var(--accent-purple)" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {data && (
        <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="card" style={{ borderTop: "4px solid var(--border-light)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Baseline Risk</h3>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              <p><strong>Stockout Prediction:</strong> {data.baseline_risk.stockout_prediction_days ? `${data.baseline_risk.stockout_prediction_days} days` : "No stockout expected"}</p>
              <p style={{ marginTop: 8 }}><strong>Insight:</strong> {data.baseline_risk.risk_insight}</p>
            </div>
          </div>
          <div className="card" style={{ borderTop: "4px solid var(--accent-purple)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Simulated Risk</h3>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              <p><strong>Stockout Prediction:</strong> {data.simulated_risk.stockout_prediction_days ? `${data.simulated_risk.stockout_prediction_days} days` : "No stockout expected"}</p>
              <p style={{ marginTop: 8 }}><strong>Insight:</strong> {data.simulated_risk.risk_insight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
