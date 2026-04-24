import { useEffect, useState } from "react";
import { postJson } from "../api";

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
  inventory,
  setInventory,
}: {
  storeId: string;
  productId: string;
  inventory: number;
  setInventory: (value: number) => void;
}) {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReorder = () => {
    if (!storeId.trim() || !productId.trim()) {
      setRec(null);
      setError("Enter a store ID and product ID.");
      return;
    }

    setLoading(true);
    setError("");

    postJson<Recommendation>("/reorder/", {
      store_id: storeId.trim(),
      product_id: productId.trim(),
      current_inventory: inventory,
    })
      .then(setRec)
      .catch((err: Error) => {
        setRec(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReorder();
  }, [storeId, productId, inventory]);

  const badge = rec?.reorder_now
    ? { label: "REORDER NOW", color: "#dc2626" }
    : { label: "STOCK OK", color: "#16a34a" };

  return (
    <div className="panel">
      <h3>Reorder Recommendation</h3>
      <div style={{ marginBottom: "12px" }}>
        <label>Current Inventory: </label>
        <input
          type="number"
          min={0}
          value={inventory}
          onChange={(e) => setInventory(Number(e.target.value))}
          className="inventory-input"
          style={{ marginLeft: "8px", width: "96px" }}
        />
        <button
          onClick={fetchReorder}
          className="secondary-button"
          style={{ marginLeft: "8px" }}
        >
          Check
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Calculating...</p>
      ) : (
        rec && (
          <>
            <div
              style={{
                color: badge.color,
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "12px",
              }}
            >
              {badge.label}
            </div>
            <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "100%" }}>
              <tbody>
                {[
                  ["Recommended Order Qty", rec.recommended_quantity],
                  ["Reorder Point", rec.reorder_point],
                  ["Safety Stock", rec.safety_stock],
                ].map(([label, val]) => (
                  <tr key={label as string}>
                    <td style={{ color: "#666", padding: "4px 0" }}>{label}</td>
                    <td style={{ fontWeight: 600 }}>{val} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontStyle: "italic", marginTop: "12px" }}>
              {rec.reasoning}
            </p>
          </>
        )
      )}
    </div>
  );
}
