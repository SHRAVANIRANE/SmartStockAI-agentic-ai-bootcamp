import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  RotateCcw,
  UploadCloud,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

interface UploadResult {
  message: string;
  rows: number;
  stores: string[];
  products: string[];
  source: string;
}

export default function DataUpload({
  onUploadSuccess,
}: {
  onUploadSuccess: (stores: string[], products: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/data/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult(data);
      onUploadSuccess(data.stores, data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    setUploading(true);
    setError("");
    try {
      const res = await fetch(`${API}/data/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      setResult(data);
      onUploadSuccess(data.stores, []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <UploadCloud size={17} strokeWidth={2.1} />
            Upload Inventory Data
          </h3>
          <p className="card-subtitle">
            CSV and JSON uploads update the active dataset and refresh selectors.
          </p>
        </div>
      </div>

      <p className="muted-text" style={{ marginBottom: 16 }}>
        Required columns:{" "}
        <code className="inline-code">date, store_id, product_id, units_sold</code>
      </p>

      <label className="upload-zone">
        <UploadCloud className="upload-icon" size={34} strokeWidth={1.9} />
        <div className="upload-title">
          {uploading ? "Processing upload..." : "Click to upload CSV or JSON"}
        </div>
        <div className="upload-hint">Supports .csv and .json files</div>
        <input
          type="file"
          accept=".csv,.json"
          onChange={handleUpload}
          style={{ display: "none" }}
          disabled={uploading}
        />
      </label>

      <button className="btn btn-secondary" onClick={handleReset} disabled={uploading}>
        <RotateCcw size={16} strokeWidth={2.2} />
        Reset to default dataset
      </button>

      {result && (
        <div className="upload-result">
          <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
            <CheckCircle2 size={16} />
            <strong>{result.message}</strong>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Stores: {result.stores.join(", ") || "Default stores"}
          </span>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        </div>
      )}

      <div className="format-example">
        <div className="format-title">
          <FileJson size={15} />
          Example formats
        </div>
        <div>
          <strong>CSV:</strong> date,store_id,product_id,units_sold,price,discount
          <br />
          <strong>JSON:</strong>{" "}
          [{`{"date":"2024-01-01","store_id":"NYC01","product_id":"SKU001","units_sold":120}`}]
        </div>
      </div>
    </div>
  );
}
