import { useState } from "react";
import ForecastChart from "../components/ForecastChart";
import ReorderTable from "../components/ReorderTable";
import AgentChat from "../components/AgentChat";
import MCPServerChart from "../components/MCPServerChart";

export default function Dashboard() {
  const [storeId, setStoreId] = useState("S001");
  const [productId, setProductId] = useState("P0001");
  const [inventory, setInventory] = useState(100);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Retail operations dashboard</p>
          <h1>Inventory Demand Forecasting Agent</h1>
          <p className="hero-copy">
            Forecast demand, evaluate reorder decisions, and show how the agent uses tools.
          </p>
        </div>
        <div className="metric-row">
          <div>
            <span className="metric-label">Store</span>
            <strong>{storeId || "-"}</strong>
          </div>
          <div>
            <span className="metric-label">Product</span>
            <strong>{productId || "-"}</strong>
          </div>
          <div>
            <span className="metric-label">Inventory</span>
            <strong>{inventory}</strong>
          </div>
        </div>
      </header>

      <div className="controls">
        <label className="control">
          Store ID:
          <input
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            placeholder="S001"
          />
        </label>
        <label className="control">
          Product ID:
          <input
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="P0001"
          />
        </label>
        <label className="control">
          Current Inventory:
          <input
            type="number"
            min={0}
            value={inventory}
            onChange={(e) => setInventory(Number(e.target.value))}
            placeholder="100"
          />
        </label>
      </div>

      <div className="grid">
        <ForecastChart storeId={storeId} productId={productId} />
        <ReorderTable
          storeId={storeId}
          productId={productId}
          inventory={inventory}
          setInventory={setInventory}
        />
      </div>

      <div style={{ marginTop: "24px" }}>
        <MCPServerChart />
      </div>

      <div style={{ marginTop: "24px" }}>
        <AgentChat storeId={storeId} productId={productId} />
      </div>
    </div>
  );
}
