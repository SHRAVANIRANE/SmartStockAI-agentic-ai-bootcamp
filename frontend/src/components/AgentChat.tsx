import { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;

interface Message { role: "user" | "agent"; text: string; time: string }

const PILLS = [
  "What is the demand trend?",
  "Should I reorder now?",
  "What drives demand most?",
  "Peak demand period?",
  "How much safety stock?",
];

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AgentChat({ storeId, productId }: { storeId: string; productId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: `Hi! I'm your AI inventory assistant powered by Gemma 3. I have real forecast data for ${productId} at ${storeId}. Ask me anything!`, time: now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    setMessages([{ role: "agent", text: `Switched to ${productId} at ${storeId}. I now have the latest forecast data. What would you like to know?`, time: now() }]);
  }, [storeId, productId]);

  const send = async (text?: string) => {
    const message = text || input;
    if (!message.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: message, time: now() }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, store_id: storeId, product_id: productId }),
      });
      const data = await res.json();
      const aiResponse = data.response || "No response.";
      setMessages((m) => [...m, { role: "agent", text: aiResponse, time: now() }]);
      
      // Voice synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // stop current speech
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
      
    } catch {
      setMessages((m) => [...m, { role: "agent", text: "Connection error. Please try again.", time: now() }]);
    }
    setLoading(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      send(speechToText);
    };
    
    recognition.start();
  };

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <div className="chat-avatar">AI</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Inventory AI Assistant</div>
          <div className="chat-online">● Online · Gemma 3 · {storeId}/{productId}</div>
        </div>
      </div>

      <div className="chat-pills">
        {PILLS.map((q) => (
          <button key={q} className="chat-pill" onClick={() => send(q)} disabled={loading}>{q}</button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className={`chat-bubble ${m.role}`}>{m.text}</div>
            <div className="chat-time">{m.time}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg agent">
            <div className="chat-typing">Analyzing inventory data...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row" style={{ display: "flex", gap: "8px" }}>
        <button 
          onClick={startListening} 
          disabled={loading}
          style={{ 
            background: isListening ? "var(--accent-red)" : "var(--bg-elevated)", 
            border: "1px solid var(--border)", 
            color: isListening ? "white" : "var(--text-primary)", 
            borderRadius: "50%", 
            width: "42px", 
            height: "42px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s ease"
          }}
          title="Voice Assistant"
        >
          🎤
        </button>
        <input className="chat-input" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about inventory, demand, or reorder decisions..." 
          style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading}
          style={{ padding: "10px 18px", flexShrink: 0 }}>
          Send
        </button>
      </div>
    </div>
  );
}
