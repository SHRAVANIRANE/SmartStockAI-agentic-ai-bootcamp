import React from "react";

export interface KPIData {
  total_demand: number;
  reorder_alerts: boolean;
  stock_risk: string;
  forecast_accuracy: string;
}

interface KPICardsProps {
  data: KPIData | null;
  loading: boolean;
}

export default function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="kpi-grid" style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card blue">
            <div className="kpi-header"><div className="kpi-title">Loading...</div></div>
            <div className="kpi-value">—</div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: "Total Demand (30d)",
      value: data.total_demand.toLocaleString(),
      color: "blue",
      icon: "📈"
    },
    {
      title: "Reorder Alert",
      value: data.reorder_alerts ? "Action Needed" : "Healthy",
      color: data.reorder_alerts ? "red" : "green",
      icon: data.reorder_alerts ? "⚠️" : "✅"
    },
    {
      title: "Stock Risk",
      value: data.stock_risk,
      color: data.stock_risk === "High" ? "red" : data.stock_risk === "Medium" ? "orange" : "green",
      icon: "🛡️"
    },
    {
      title: "Forecast Accuracy",
      value: data.forecast_accuracy,
      color: "purple",
      icon: "🎯"
    }
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c, i) => (
        <div key={i} className={`kpi-card ${c.color}`}>
          <div className="kpi-header">
            <div className="kpi-title">{c.title}</div>
            <div className="kpi-icon">{c.icon}</div>
          </div>
          <div className="kpi-value">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
