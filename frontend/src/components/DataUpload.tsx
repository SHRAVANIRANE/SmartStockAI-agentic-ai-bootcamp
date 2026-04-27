import { useState } from "react";

const API = import.meta.env.VITE_API_URL;

interface UploadResult { message: string; rows: number; stores: string[]; source: string; }

export default function DataUpload({ onUploadSuccess }: { onUploadSuccess: (stores: string[], products: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(""); setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/data/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult(data);
      // Pass both stores AND products back so dashboard resets selectors
      onUploadSuccess(data.stores, data.products);
    } catch (err: any) { setError(err.message); }
    setUploading(false);
  };

  const handleReset = async () => {
    setUploading(true); setError("");
    const res = await fetch(`${API}/data/reset`, { method: "POST" });
    const data = await res.json();
    setResult(data);
    onUploadSuccess(data.stores, []);
    setUploading(false);
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>Upload Your Own Data</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
        Upload a <strong style={{ color: "var(--text-secondary)" }}>CSV</strong> or <strong style={{ color: "var(--text-secondary)" }}>JSON</strong> file with your company's inventory data.<br />
        Required columns: <code style={{ color: "var(--accent-blue)", background: "var(--bg-primary)", padding: "1px 6px", borderRadius: 4 }}>date, store_id, product_id, units_sold</code>
      </p>

      <label className="upload-zone">
        <div style={{ fontSize: 36, marginBottom: 12, color: "var(--text-muted)" }}>↑</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
          {uploading ? "Uploading..." : "Click to upload CSV or JSON"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Supports .csv and .json files</div>
        <input type="file" accept=".csv,.json" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-secondary" onClick={handleReset} disabled={uploading}>
          Reset to Default Dataset
        </button>
      </div>

      {result && (
        <div className="upload-result">
          {result.message}<br />
          <span style={{ fontSize: 12, opacity: 0.8 }}>Stores: {result.stores.join(", ")}</span>
        </div>
      )}
      {error && <div className="upload-error">❌ {error}</div>}

      <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg-primary)", borderRadius: 8, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>📋 Example formats</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.8 }}>
          <strong>CSV:</strong> date,store_id,product_id,units_sold,price,discount<br />
          <strong>JSON:</strong> [{`{"date":"2024-01-01","store_id":"NYC01","product_id":"SKU001","units_sold":120}`}]
        </div>
      </div>
    </div>
  );
}
