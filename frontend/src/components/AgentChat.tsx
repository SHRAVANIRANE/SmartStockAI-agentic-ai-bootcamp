import { useEffect, useRef, useState } from "react";
import { postJson } from "../api";

interface Message {
  role: "user" | "agent";
  text: string;
  time: string;
}

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

function introMessage(storeId: string, productId: string): Message {
  return {
    role: "agent",
    text: `I have forecast and reorder data for ${productId} at ${storeId}. What would you like to know?`,
    time: now(),
  };
}

export default function AgentChat({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(() => [
    introMessage(storeId, productId),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([introMessage(storeId, productId)]);
  }, [storeId, productId]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setMessages((current) => [...current, { role: "user", text: message, time: now() }]);
    setInput("");
    setLoading(true);

    try {
      const data = await postJson<{ response?: string }>("/chat/", {
        message,
        store_id: storeId.trim() || undefined,
        product_id: productId.trim() || undefined,
      });
      const aiResponse = data.response ?? "No response returned.";
      setMessages((current) => [
        ...current,
        { role: "agent", text: aiResponse, time: now() },
      ]);

      if (window.speechSynthesis && aiResponse) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Connection error. Please try again.";
      setMessages((current) => [...current, { role: "agent", text, time: now() }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: "Voice recognition is not supported in this browser.",
          time: now(),
        },
      ]);
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
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
            Inventory AI Assistant
          </div>
          <div className="chat-online">
            Online - Gemma 3 - {storeId}/{productId}
          </div>
        </div>
      </div>

      <div className="chat-pills">
        {PILLS.map((question) => (
          <button
            key={question}
            className="chat-pill"
            onClick={() => send(question)}
            disabled={loading}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={`${message.time}-${index}`} className={`chat-msg ${message.role}`}>
            <div className={`chat-bubble ${message.role}`}>{message.text}</div>
            <div className="chat-time">{message.time}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg agent">
            <div className="chat-typing">Analyzing inventory data...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row" style={{ display: "flex", gap: 8 }}>
        <button
          onClick={startListening}
          disabled={loading}
          style={{
            background: isListening ? "var(--accent-red)" : "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: isListening ? "white" : "var(--text-primary)",
            borderRadius: "50%",
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s ease",
            fontSize: 11,
            fontWeight: 700,
          }}
          title="Voice assistant"
          aria-label="Voice assistant"
        >
          Mic
        </button>
        <input
          className="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && send()}
          placeholder="Ask about inventory, demand, or reorder decisions..."
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={() => send()}
          disabled={loading}
          style={{ padding: "10px 18px", flexShrink: 0 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
