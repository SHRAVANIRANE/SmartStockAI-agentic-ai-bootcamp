import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";

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
        <h3 className="card-title">
          <ShieldAlert size={17} strokeWidth={2.1} />
          Inventory Risk Detection
        </h3>
        <div className="center-state" style={{ minHeight: 130 }}>
          Analyzing risk profile...
        </div>
      </div>
    );
  }

  if (!data) return null;

  let riskLevel = "low";
  if (data.stockout_prediction_days && data.stockout_prediction_days <= 7) {
    riskLevel = "high";
  } else if (
    data.understock_risk ||
    (data.stockout_prediction_days && data.stockout_prediction_days <= 14)
  ) {
    riskLevel = "medium";
  } else if (data.overstock_risk) {
    riskLevel = "medium";
  }

  const chipClass =
    riskLevel === "high" ? "danger" : riskLevel === "medium" ? "warning" : "success";

  return (
    <div className="card risk-card">
      <div className="risk-title-row">
        <h3 className="card-title">
          <ShieldAlert size={17} strokeWidth={2.1} />
          Inventory Risk Detection
        </h3>
        <span className={`risk-chip ${chipClass}`}>{riskLevel.toUpperCase()} RISK</span>
      </div>

      {data.stockout_prediction_days !== null && data.stockout_prediction_days <= 14 && (
        <div className="risk-indicator high">
          <div className="risk-icon" style={{ color: "var(--accent-red)" }}>
            <AlertTriangle size={20} strokeWidth={2.1} />
          </div>
          <div>
            <div style={{ fontWeight: 750, fontSize: 13 }}>Stockout warning</div>
            <div className="muted-text">
              Expected in about {data.stockout_prediction_days} days
            </div>
          </div>
        </div>
      )}

      {data.overstock_risk && (
        <div className="risk-indicator medium">
          <div className="risk-icon" style={{ color: "var(--accent-orange)" }}>
            <TrendingDown size={20} strokeWidth={2.1} />
          </div>
          <div>
            <div style={{ fontWeight: 750, fontSize: 13 }}>Overstock alert</div>
            <div className="muted-text">Excess capital tied up in inventory</div>
          </div>
        </div>
      )}

      {!data.overstock_risk &&
        !data.understock_risk &&
        (!data.stockout_prediction_days || data.stockout_prediction_days > 14) && (
          <div className="risk-indicator low">
            <div className="risk-icon" style={{ color: "var(--accent-green)" }}>
              <CheckCircle2 size={20} strokeWidth={2.1} />
            </div>
            <div>
              <div style={{ fontWeight: 750, fontSize: 13 }}>Optimal inventory</div>
              <div className="muted-text">Stock levels are balanced for the forecast window</div>
            </div>
          </div>
        )}

      <div
        className="ai-insight"
        style={{
          borderLeftColor:
            riskLevel === "high"
              ? "var(--accent-red)"
              : riskLevel === "medium"
                ? "var(--accent-orange)"
                : "var(--accent-green)",
        }}
      >
        <p>
          <strong style={{ color: "var(--text-primary)" }}>AI insight:</strong>{" "}
          {data.risk_insight}
        </p>
      </div>
    </div>
  );
}
