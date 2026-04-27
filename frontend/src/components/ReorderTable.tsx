import { useEffect, useState } from "react";
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

    postJson<Recommendation>("/reorder/", requestBody)
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

  return (
    <div className="card">
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          Reorder Recommendation
        </h3>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {storeId} / {productId}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label className="selector-label" style={{ display: "block", marginBottom: 5 }}>
            Current Inventory
          </label>
          <input
            type="number"
            min={0}
            value={inventory}
            onChange={(event) => setInventory(Number(event.target.value))}
            className="selector-input"
            style={{ width: "100%", minWidth: "auto" }}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={fetchReorder}
          disabled={loading}
          style={{ marginTop: 20, padding: "9px 16px" }}
        >
          Check
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "var(--accent-red)",
            fontSize: 13,
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: 24,
            fontSize: 13,
          }}
        >
          Calculating...
        </div>
      ) : (
        rec && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div
                className={`status-badge ${rec.reorder_now ? "danger" : "success"}`}
                style={{ flex: 1, marginBottom: 0 }}
              >
                {rec.reorder_now ? "REORDER NOW" : "STOCK SUFFICIENT"}
              </div>
              <div
                className={`status-badge ${priorityClass}`}
                style={{
                  flex: 1,
                  marginBottom: 0,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>
                  PRIORITY
                </span>
                <span>{priority}</span>
              </div>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-bar-header">
                <span>Stock Level vs Reorder Point</span>
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
                    AI Reasoning:
                  </strong>{" "}
                  {rec.reasoning}
                </p>
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={handleGeneratePo}
              disabled={generatingPo}
              style={{
                width: "100%",
                padding: 12,
                background: "var(--bg-elevated)",
                border: "1px solid var(--accent-blue)",
                color: "var(--accent-blue)",
                fontWeight: 600,
              }}
            >
              {generatingPo ? "Generating PDF..." : "Generate Purchase Order PDF"}
            </button>
          </>
        )
      )}
    </div>
  );
}
