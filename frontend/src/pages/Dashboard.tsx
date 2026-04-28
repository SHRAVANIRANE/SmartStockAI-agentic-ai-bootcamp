import { useEffect, useState } from "react";
import {
  Boxes,
  Database,
  LineChart,
  MessageSquare,
  Search,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ForecastChart from "../components/ForecastChart";
import ReorderTable from "../components/ReorderTable";
import AgentChat from "../components/AgentChat";
import DataUpload from "../components/DataUpload";
import KPICards, { KPIData } from "../components/KPICards";
import InventoryRisk, { RiskData } from "../components/InventoryRisk";
import DemandPattern from "../components/DemandPattern";
import ExternalFactors from "../components/ExternalFactors";
import SimulationDashboard from "../components/SimulationDashboard";

const API = import.meta.env.VITE_API_URL;

type TabId = "forecast" | "chat" | "upload" | "simulation";

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "forecast", label: "Forecast", icon: LineChart },
  { id: "simulation", label: "Simulation", icon: Settings2 },
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "upload", label: "Data", icon: Database },
];

export default function Dashboard() {
  const [stores, setStores] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [storeId, setStoreId] = useState("S001");
  const [productId, setProductId] = useState("P0001");
  const [applied, setApplied] = useState({ storeId: "S001", productId: "P0001" });
  const [dataInfo, setDataInfo] = useState({
    rows: 0,
    source: "default",
    totalProducts: 0,
  });
  const [activeTab, setActiveTab] = useState<TabId>("forecast");
  const [refreshKey, setRefreshKey] = useState(0);

  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/forecast/stores`)
      .then((r) => r.json())
      .then((d) => setStores(d.stores || []))
      .catch(() => setStores(["S001", "S002", "S003", "S004", "S005"]));
    fetch(`${API}/data/info`)
      .then((r) => r.json())
      .then((d) =>
        setDataInfo({
          rows: d.rows,
          source: d.source,
          totalProducts: d.total_products,
        }),
      )
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    fetch(`${API}/forecast/products?store_id=${storeId}`)
      .then((r) => r.json())
      .then((d) => {
        const prods = d.products || [];
        setProducts(prods);
        setProductId(prods[0] || "P0001");
      })
      .catch(() => setProducts(["P0001"]));
  }, [storeId]);

  useEffect(() => {
    if (activeTab === "forecast") {
      setKpiLoading(true);
      fetch(`${API}/forecast/kpi_risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: applied.storeId,
          product_id: applied.productId,
          current_inventory: 100,
        }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const errText = await r.text();
            throw new Error(errText || "API Error");
          }
          return r.json();
        })
        .then((data) => {
          setKpiData(data.kpis);
          setRiskData(data.risk);
        })
        .catch(console.error)
        .finally(() => setKpiLoading(false));
    }
  }, [applied, activeTab]);

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon" aria-hidden="true">
            <Boxes size={21} strokeWidth={2.2} />
          </div>
          <div>
            <div className="navbar-title">Inventory Forecasting Agent</div>
            <div className="navbar-subtitle">
              XGBoost / Gemma AI / LangChain
            </div>
          </div>
        </div>

        <div className="nav-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? "active" : "inactive"}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} strokeWidth={2.1} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="main">
        {activeTab === "forecast" && (
          <KPICards data={kpiData} loading={kpiLoading} />
        )}

        <div className="selector-bar">
          <div className="selector-group">
            <label className="selector-label">Store</label>
            <select
              className="selector-select"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="selector-group">
            <label className="selector-label">Product</label>
            <select
              className="selector-select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setApplied({ storeId, productId })}
          >
            <Search size={16} strokeWidth={2.2} />
            Analyze
          </button>
          <div className="analyzing-badge">
            <span className="blue">{applied.storeId}</span> /
            <span className="purple">{applied.productId}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {dataInfo.rows ? `${dataInfo.rows.toLocaleString()} rows` : "Dataset ready"}
            </span>
          </div>
        </div>

        {activeTab === "forecast" && (
          <>
            <ExternalFactors storeId={applied.storeId} productId={applied.productId} />
            <div className="content-grid">
              <ForecastChart storeId={applied.storeId} productId={applied.productId} />
              <ReorderTable storeId={applied.storeId} productId={applied.productId} />
            </div>
            <DemandPattern storeId={applied.storeId} productId={applied.productId} />
            <InventoryRisk data={riskData} loading={kpiLoading} />
          </>
        )}

        {activeTab === "chat" && (
          <AgentChat storeId={applied.storeId} productId={applied.productId} />
        )}

        {activeTab === "simulation" && (
          <SimulationDashboard storeId={applied.storeId} productId={applied.productId} />
        )}

        {activeTab === "upload" && (
          <DataUpload
            onUploadSuccess={(newStores, newProducts) => {
              setStores(newStores);
              const firstStore = newStores[0] || "S001";
              const firstProduct = newProducts[0] || "P0001";
              setStoreId(firstStore);
              setProductId(firstProduct);
              setProducts(newProducts);
              setApplied({ storeId: firstStore, productId: firstProduct });
              setRefreshKey((k) => k + 1);
              setActiveTab("forecast");
            }}
          />
        )}
      </div>
    </div>
  );
}
