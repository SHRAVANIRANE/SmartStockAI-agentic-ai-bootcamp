import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { API_BASE } from "../api";

interface UploadResult {
  message: string;
  rows: number;
  stores: string[];
  products: string[];
  source: string;
  column_mapping?: {
    mapped: Record<string, string>;
    missing: { column: string; action: string }[];
  };
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
      const res = await fetch(`${API_BASE}/data/upload`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(120000),
      });
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
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/data/reset`, {
        method: "POST",
        signal: AbortSignal.timeout(120000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      setResult({ ...data, column_mapping: { mapped: {}, missing: [] } });
      onUploadSuccess(data.stores, data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setUploading(false);
    }
  };

  const mappedEntries = Object.entries(result?.column_mapping?.mapped || {});
  const generatedFields = result?.column_mapping?.missing || [];

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

      <div className="upload-note">
        <strong>Supported sources:</strong> Rossmann Store Sales, Walmart Sales,
        Superstore Sales, M5 Forecasting, Retail Store Inventory, and company files
        with date plus sales quantity fields.
      </div>

      <label className="upload-zone">
        <UploadCloud className="upload-icon" size={34} strokeWidth={1.9} />
        <div className="upload-title">
          {uploading ? "Processing upload..." : "Click to upload CSV or JSON"}
        </div>
        <div className="upload-hint">
          Minimum required: date, store/product identifier, sales quantity
        </div>
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

      {result && result.rows > 0 && (
        <div className="upload-result">
          <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
            <CheckCircle2 size={16} />
            <strong>{result.message}</strong>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            {result.stores.length} stores, {result.products?.length || 0} products
          </span>
        </div>
      )}

      {mappedEntries.length > 0 && (
        <div className="mapping-panel">
          <div className="mapping-title">Column mapping detected</div>
          <div className="mapping-grid">
            {mappedEntries.map(([original, mapped]) => (
              <div key={original} className="mapping-row">
                <span className="mapping-source">{original}</span>
                <span className="mapping-arrow">-&gt;</span>
                <span className="mapping-target">{mapped}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {generatedFields.length > 0 && (
        <div className="mapping-panel">
          <div className="mapping-title">Auto-generated fields</div>
          {generatedFields.map((field) => (
            <div key={field.column} className="mapping-row">
              <span className="mapping-target">{field.column}</span>
              <span>{field.action}</span>
            </div>
          ))}
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
          Minimum required columns
        </div>
        <div>
          <strong>date</strong>: any date format
          <br />
          <strong>store_id</strong>: store or branch identifier, generated if missing
          <br />
          <strong>product_id</strong>: product, SKU, or item identifier
          <br />
          <strong>units_sold</strong>: sales quantity, demand, qty, or quantity
        </div>
      </div>
    </div>
  );
}
