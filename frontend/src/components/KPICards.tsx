import {
  AlertTriangle,
  Minus,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

interface CardConfig {
  title: string;
  value: string;
  color: string;
  icon: LucideIcon;
}

export default function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="kpi-grid" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card blue">
            <div className="kpi-header">
              <div className="kpi-title">Loading metric</div>
              <div className="kpi-icon">
                <Minus size={17} />
              </div>
            </div>
            <div className="kpi-value">...</div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards: CardConfig[] = [
    {
      title: "Total Demand (30d)",
      value: data.total_demand.toLocaleString(),
      color: "blue",
      icon: TrendingUp,
    },
    {
      title: "Reorder Alert",
      value: data.reorder_alerts ? "Action Needed" : "Healthy",
      color: data.reorder_alerts ? "red" : "green",
      icon: data.reorder_alerts ? AlertTriangle : ShieldCheck,
    },
    {
      title: "Stock Risk",
      value: data.stock_risk,
      color:
        data.stock_risk === "High"
          ? "red"
          : data.stock_risk === "Medium"
            ? "orange"
            : "green",
      icon: ShieldCheck,
    },
    {
      title: "Forecast Accuracy",
      value: data.forecast_accuracy,
      color: "purple",
      icon: Target,
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className={`kpi-card ${card.color}`}>
            <div className="kpi-header">
              <div className="kpi-title">{card.title}</div>
              <div className="kpi-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </div>
            </div>
            <div className="kpi-value">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
