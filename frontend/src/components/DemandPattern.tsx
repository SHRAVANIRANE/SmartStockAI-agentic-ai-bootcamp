import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

interface DayPattern {
  day: string;
  avg_demand: number;
}

interface MonthPattern {
  month: string;
  avg_demand: number;
}

interface DemandPatternData {
  weekly_pattern: DayPattern[];
  monthly_pattern: MonthPattern[];
}

export default function DemandPattern({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [data, setData] = useState<DemandPatternData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/forecast/pattern?store_id=${storeId}&product_id=${productId}`)
      .then(async (r) => {
        if (!r.ok) {
          const errText = await r.text();
          throw new Error(errText || "API Error");
        }
        return r.json();
      })
      .then((res: DemandPatternData) => setData(res))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId, productId]);

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
        <p style={{ color: "var(--text-muted)", marginBottom: 4, fontWeight: 700 }}>
          {label}
        </p>
        <p style={{ color: payload[0].color, margin: 0 }}>
          Avg demand: <strong>{payload[0].value.toFixed(1)}</strong>
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-title">
          <CalendarRange size={17} strokeWidth={2.1} />
          Seasonal Demand Patterns
        </h3>
        <div className="center-state" style={{ minHeight: 130 }}>
          Analyzing historical patterns...
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const maxWeekly = Math.max(...data.weekly_pattern.map((d) => d.avg_demand));
  const maxMonthly = Math.max(...data.monthly_pattern.map((d) => d.avg_demand));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <CalendarRange size={17} strokeWidth={2.1} />
            Seasonal Demand Patterns
          </h3>
          <p className="card-subtitle">
            {storeId} / {productId}
          </p>
        </div>
      </div>

      <div className="pattern-grid">
        <div>
          <h4 className="pattern-panel-title">Weekly rhythm</h4>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data.weekly_pattern} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
              <Bar dataKey="avg_demand" radius={[4, 4, 0, 0]}>
                {data.weekly_pattern.map((entry, index) => (
                  <Cell
                    key={`weekly-${index}`}
                    fill={entry.avg_demand === maxWeekly ? "var(--accent-purple)" : "var(--accent-blue)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="pattern-panel-title">Monthly seasonality</h4>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data.monthly_pattern} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
              <Bar dataKey="avg_demand" radius={[4, 4, 0, 0]}>
                {data.monthly_pattern.map((entry, index) => (
                  <Cell
                    key={`monthly-${index}`}
                    fill={entry.avg_demand === maxMonthly ? "var(--accent-green)" : "var(--accent-blue)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
