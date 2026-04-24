import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
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
}

export default function ForecastChart({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storeId.trim() || !productId.trim()) {
      setData([]);
      setSummary("");
      setError("Enter a store ID and product ID.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    postJson<ForecastResponse>("/forecast/", {
      store_id: storeId.trim(),
      product_id: productId.trim(),
      horizon_days: 30,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res.forecast ?? []);
        setSummary(res.trend_summary ?? "");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setData([]);
        setSummary("");
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeId, productId]);

  return (
    <div className="panel">
      <h3>30-Day Demand Forecast</h3>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading forecast...</p>
      ) : (
        !error && (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  fill="#dbeafe"
                  stroke="none"
                  name="Upper"
                />
                <Area
                  type="monotone"
                  dataKey="lower_bound"
                  fill="#fff"
                  stroke="none"
                  name="Lower"
                />
                <Line
                  type="monotone"
                  dataKey="predicted_units"
                  stroke="#2563eb"
                  dot={false}
                  name="Forecast"
                />
              </ComposedChart>
            </ResponsiveContainer>
            {summary && <p className="muted">{summary}</p>}
          </>
        )
      )}
    </div>
  );
}
