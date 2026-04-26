import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

interface FactorInfo {
  date: string;
  weather: string;
  is_holiday: boolean;
  competitor_undercut: boolean;
}

const getWeatherEmoji = (weather: string) => {
  const w = weather.toLowerCase();
  if (w.includes("snow") || w.includes("cold")) return "❄️";
  if (w.includes("rain")) return "🌧️";
  if (w.includes("cloud")) return "☁️";
  if (w.includes("wind")) return "💨";
  if (w.includes("hot")) return "🔥";
  return "☀️";
};

export default function ExternalFactors({ storeId, productId }: { storeId: string; productId: string }) {
  const [factors, setFactors] = useState<FactorInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/forecast/external_factors?store_id=${storeId}&product_id=${productId}`)
      .then(async r => {
        if (!r.ok) throw new Error("API Error");
        return r.json();
      })
      .then(data => setFactors(data.upcoming_factors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, productId]);

  if (loading || factors.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Upcoming External Factors (7-Day Outlook)
      </h3>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {factors.map((f, i) => (
          <div key={i} style={{ 
            background: "var(--bg-elevated)", 
            border: "1px solid var(--border)", 
            borderRadius: 12, 
            padding: "12px 16px",
            minWidth: 140,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
              {new Date(f.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span>{getWeatherEmoji(f.weather)}</span>
              <span style={{ color: "var(--text-primary)" }}>{f.weather}</span>
            </div>
            
            {f.is_holiday && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent-purple)", fontWeight: 500 }}>
                <span>🎉</span> Holiday Alert
              </div>
            )}
            
            {f.competitor_undercut && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent-red)", fontWeight: 500 }}>
                <span>📉</span> Price War Risk
              </div>
            )}
            
            {!f.is_holiday && !f.competitor_undercut && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Standard Conditions
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
