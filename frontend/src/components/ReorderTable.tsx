import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { API_BASE, postJson } from "../api";

interface Recommendation {
  reorder_now: boolean;
  recommended_quantity: number;
  reorder_point: number;
  safety_stock: number;
  reasoning: string;
}

export default function ReorderTable({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [inventory, setInventory] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatingPo, setGeneratingPo] = useState(false);

  const requestBody = {
    store_id: storeId.trim(),
    product_id: productId.trim(),
    current_inventory: inventory,
    lead_time_days: 7,
  };

  const fetchReorder = () => {
    if (!storeId.trim() || !productId.trim()) {
      setRec(null);
      setError("Enter a store ID and product ID.");
      return;
    }

    setLoading(true);
    setError("");

    postJson<Recommendation>("/reorder/", requestBody, {
      signal: AbortSignal.timeout(120000),
    })
      .then(setRec)
      .catch((err: Error) => {
        setRec(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  const handleGeneratePo = async () => {
    setGeneratingPo(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/reorder/generate_po`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Failed to generate purchase order");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `PO-${storeId}-${productId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate purchase order");
    } finally {
      setGeneratingPo(false);
    }
  };

  useEffect(() => {
    fetchReorder();
  }, [storeId, productId]);

  const stockPct = rec?.reorder_point
    ? Math.min(100, Math.round((inventory / (rec.reorder_point * 1.5)) * 100))
    : 0;
  const stockColor = rec?.reorder_now
    ? "var(--accent-red)"
    : stockPct < 60
      ? "var(--accent-orange)"
      : "var(--accent-green)";

  let priority = "Low";
  let priorityClass = "success";
  if (rec) {
    if (inventory <= rec.safety_stock) {
      priority = "High";
      priorityClass = "danger";
    } else if (rec.reorder_now) {
      priority = "Medium";
      priorityClass = "warning";
    }
  }

  const StatusIcon = rec?.reorder_now ? AlertTriangle : CheckCircle2;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <PackageCheck size={17} strokeWidth={2.1} />
            Reorder Recommendation
          </h3>
          <p className="card-subtitle">
            {storeId} / {productId}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label className="selector-label" htmlFor="current-inventory">
            Current Inventory
          </label>
          <input
            id="current-inventory"
            type="number"
            min={0}
            value={inventory}
            onChange={(event) => setInventory(Number(event.target.value))}
            className="selector-input"
            style={{ marginTop: 7, minWidth: 0, width: "100%" }}
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchReorder}
          disabled={loading}
          style={{ alignSelf: "flex-end" }}
        >
          <RefreshCw size={15} strokeWidth={2.2} />
          Check
        </button>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="center-state" style={{ minHeight: 170 }}>
          Calculating reorder position...
        </div>
      ) : (
        rec && (
          <>
            <div className="status-row">
              <div className={`status-badge ${rec.reorder_now ? "danger" : "success"}`}>
                <span>Status</span>
                <div style={{ alignItems: "center", display: "flex", gap: 7 }}>
                  <StatusIcon size={16} />
                  {rec.reorder_now ? "Reorder Now" : "Stock Sufficient"}
                </div>
              </div>
              <div className={`status-badge ${priorityClass}`}>
                <span>Priority</span>
                {priority}
              </div>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-bar-header">
                <span>Stock level vs reorder point</span>
                <span>{stockPct}%</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${stockPct}%`, background: stockColor }}
                />
              </div>
            </div>

            <div className="stats-2col">
              {[
                {
                  label: "Order Quantity",
                  value: `${rec.recommended_quantity} units`,
                  color: "var(--accent-blue)",
                },
                {
                  label: "Reorder Point",
                  value: `${rec.reorder_point} units`,
                  color: "var(--accent-purple)",
                },
                {
                  label: "Safety Stock",
                  value: `${rec.safety_stock} units`,
                  color: "var(--accent-orange)",
                },
                {
                  label: "Current Stock",
                  value: `${inventory} units`,
                  color: stockColor,
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-box">
                  <div className="stat-box-value" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="stat-box-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {rec.reasoning && (
              <div
                className="ai-insight"
                style={{ borderLeftColor: "var(--accent-purple)", marginBottom: 16 }}
              >
                <p>
                  <strong style={{ color: "var(--accent-purple)" }}>
                    AI reasoning:
                  </strong>{" "}
                  {rec.reasoning}
                </p>
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={handleGeneratePo}
              disabled={generatingPo}
              style={{ width: "100%" }}
            >
              <FileDown size={16} strokeWidth={2.2} />
              {generatingPo ? "Generating PDF..." : "Generate purchase order PDF"}
            </button>
          </>
        )
      )}
    </div>
  );
}
