import { useEffect, useState } from "react";
import { CalendarDays, LineChart } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { postJson } from "../api";

interface ForecastPoint {
  date: string;
  predicted_units: number;
  lower_bound: number;
  upper_bound: number;
}

interface ForecastResponse {
  forecast?: ForecastPoint[];
  trend_summary?: string;
  seasonality_notes?: string;
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
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}:{" "}
          <strong>
            {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
          </strong>
        </p>
      ))}
    </div>
  );
};

export default function ForecastChart({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [summary, setSummary] = useState("");
  const [seasonality, setSeasonality] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [horizon, setHorizon] = useState(14);

  useEffect(() => {
    if (!storeId.trim() || !productId.trim()) {
      setData([]);
      setSummary("");
      setSeasonality("");
      setError("Enter a store ID and product ID.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    postJson<ForecastResponse>(
      "/forecast/",
      {
        store_id: storeId.trim(),
        product_id: productId.trim(),
        horizon_days: horizon,
      },
      { signal: AbortSignal.timeout(120000) },
    )
      .then((res) => {
        if (cancelled) return;
        setData(
          res.forecast?.map((point) => ({ ...point, date: point.date.slice(5) })) ??
            [],
        );
        setSummary(res.trend_summary ?? "");
        setSeasonality(res.seasonality_notes ?? "");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setData([]);
        setSummary("");
        setSeasonality("");
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeId, productId, horizon]);

  const avg = data.length
    ? (data.reduce((sum, point) => sum + point.predicted_units, 0) / data.length).toFixed(1)
    : "-";
  const peak = data.length
    ? Math.max(...data.map((point) => point.predicted_units)).toFixed(0)
    : "-";
  const trend =
    data.length > 1
      ? data[data.length - 1].predicted_units > data[0].predicted_units
        ? "Upward"
        : "Downward"
      : "Stable";

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <LineChart size={17} strokeWidth={2.1} />
            Demand Forecast
          </h3>
          <p className="card-subtitle">
            {storeId} / {productId}
          </p>
        </div>
        <div className="selector-group">
          <label className="selector-label" htmlFor="forecast-horizon">
            Horizon
          </label>
          <select
            id="forecast-horizon"
            className="selector-select"
            value={horizon}
            onChange={(event) => setHorizon(Number(event.target.value))}
            style={{ minWidth: 94 }}
          >
            {[7, 14, 30, 60].map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mini-stats">
        {[
          { label: "Avg / Day", value: avg, color: "var(--accent-blue)" },
          { label: "Peak", value: peak, color: "var(--accent-purple)" },
          { label: "Trend", value: trend, color: "var(--accent-green)" },
        ].map((stat) => (
          <div key={stat.label} className="mini-stat">
            <div className="mini-stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="mini-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="center-state error-text">{error}</div>
      ) : loading ? (
        <div className="center-state">Loading forecast...</div>
      ) : (
        <ResponsiveContainer width="100%" height={236}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="upper_bound"
              fill="url(#forecastBand)"
              stroke="none"
              name="Upper"
            />
            <Area
              type="monotone"
              dataKey="lower_bound"
              fill="var(--bg-card)"
              stroke="none"
              name="Lower"
            />
            <Line
              type="monotone"
              dataKey="predicted_units"
              stroke="var(--accent-blue)"
              strokeWidth={2.5}
              dot={false}
              name="Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {summary && !error && (
        <div className="ai-insight">
          <p>
            <strong style={{ color: "var(--accent-blue)" }}>AI insight:</strong>{" "}
            {summary}
          </p>
          {seasonality && (
            <p style={{ marginTop: 4 }}>
              <CalendarDays size={13} style={{ verticalAlign: "-2px" }} /> Seasonality:{" "}
              {seasonality}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
