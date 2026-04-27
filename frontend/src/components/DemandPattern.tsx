import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

interface DayPattern { day: string; avg_demand: number; }
interface MonthPattern { month: string; avg_demand: number; }

interface DemandPatternData {
  weekly_pattern: DayPattern[];
  monthly_pattern: MonthPattern[];
}

export default function DemandPattern({ storeId, productId }: { storeId: string; productId: string }) {
  const [data, setData] = useState<DemandPatternData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/forecast/pattern?store_id=${storeId}&product_id=${productId}`)
      .then(async r => {
        if (!r.ok) {
          const errText = await r.text();
          throw new Error(errText || "API Error");
        }
        return r.json();
      })
      .then((res: DemandPatternData) => setData(res))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId, productId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        <p style={{ color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>{label}</p>
        <p style={{ color: payload[0].color, margin: 0 }}>
          Avg Demand: <strong>{payload[0].value.toFixed(1)}</strong>
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Seasonal Demand Patterns</h3>
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24, fontSize: 13 }}>Analyzing historical patterns...</div>
      </div>
    );
  }

  if (error || !data) return null;

  // Find max values to highlight peak bars
  const maxWeekly = Math.max(...data.weekly_pattern.map(d => d.avg_demand));
  const maxMonthly = Math.max(...data.monthly_pattern.map(d => d.avg_demand));

  return (
    <div className="card">
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Seasonal Demand Patterns</h3>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{storeId} / {productId}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Weekly Pattern */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Weekly Rhythm</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.weekly_pattern} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="avg_demand" radius={[4, 4, 0, 0]}>
                {data.weekly_pattern.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.avg_demand === maxWeekly ? "var(--accent-purple)" : "var(--accent-blue)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Pattern */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Seasonality</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.monthly_pattern} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="avg_demand" radius={[4, 4, 0, 0]}>
                {data.monthly_pattern.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.avg_demand === maxMonthly ? "var(--accent-green)" : "var(--accent-blue)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
