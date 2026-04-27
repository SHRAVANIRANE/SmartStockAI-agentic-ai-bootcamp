import React from "react";

export interface RiskData {
  overstock_risk: boolean;
  understock_risk: boolean;
  stockout_prediction_days: number | null;
  risk_insight: string;
}

interface InventoryRiskProps {
  data: RiskData | null;
  loading: boolean;
}

export default function InventoryRisk({ data, loading }: InventoryRiskProps) {
  if (loading) {
    return (
      <div className="card risk-card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Inventory Risk Detection</h3>
        <div style={{ opacity: 0.5 }}>Analyzing risk profile...</div>
      </div>
    );
  }

  if (!data) return null;

  let riskLevel = "low";
  if (data.stockout_prediction_days && data.stockout_prediction_days <= 7) riskLevel = "high";
  else if (data.understock_risk || (data.stockout_prediction_days && data.stockout_prediction_days <= 14)) riskLevel = "medium";
  else if (data.overstock_risk) riskLevel = "medium";

  return (
    <div className="card risk-card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <span>Inventory Risk Detection</span>
        <span className={`status-badge ${riskLevel === "high" ? "danger" : riskLevel === "medium" ? "warning" : "success"}`} style={{ padding: "4px 8px", fontSize: 10, marginBottom: 0 }}>
          {riskLevel.toUpperCase()} RISK
        </span>
      </h3>

      {data.stockout_prediction_days !== null && data.stockout_prediction_days <= 14 && (
        <div className="risk-indicator high">
          <div style={{ fontSize: 24 }}>🚨</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Stockout Warning</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Expected in ~{data.stockout_prediction_days} days</div>
          </div>
        </div>
      )}

      {data.overstock_risk && (
        <div className="risk-indicator medium">
          <div style={{ fontSize: 24 }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Overstock Alert</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Excess capital tied up in inventory</div>
          </div>
        </div>
      )}

      {!data.overstock_risk && !data.understock_risk && (!data.stockout_prediction_days || data.stockout_prediction_days > 14) && (
        <div className="risk-indicator low">
          <div style={{ fontSize: 24 }}>✨</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Optimal Inventory</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Stock levels are perfectly balanced</div>
          </div>
        </div>
      )}

      <div className="ai-insight" style={{ borderLeftColor: riskLevel === "high" ? "var(--accent-red)" : riskLevel === "medium" ? "var(--accent-orange)" : "var(--accent-green)" }}>
        <p><strong style={{ color: "var(--text-primary)" }}>AI Insight:</strong> {data.risk_insight}</p>
      </div>
    </div>
  );
}
