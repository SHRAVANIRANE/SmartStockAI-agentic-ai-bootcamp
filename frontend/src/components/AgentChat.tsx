import { useState } from "react";
import { postJson } from "../api";

interface Message {
  role: "user" | "agent";
  text: string;
}

export default function AgentChat({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: "Hi! Ask me anything about inventory, forecasts, or reorder decisions." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!input.trim()) return;

    const message = input.trim();
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const data = await postJson<{ response?: string }>("/agent/chat", {
        message,
        store_id: storeId.trim() || undefined,
        product_id: productId.trim() || undefined,
      });
      setMessages((m) => [
        ...m,
        { role: "agent", text: data.response ?? "No response returned." },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h3>Ask the Inventory Agent</h3>
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <span className="bubble">{m.text}</span>
          </div>
        ))}
        {loading && <p className="muted">Agent is thinking...</p>}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. Should I reorder P0001 at S001 with 50 units left?"
        />
        <button onClick={send} disabled={loading} className="primary-button">
          Send
        </button>
      </div>
    </div>
  );
}
