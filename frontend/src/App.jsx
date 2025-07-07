import React, { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";

function App() {
  const [userName, setUserName] = useState("");
  const [mobile, setMobile] = useState("");
  const [chapter, setChapter] = useState("Banking");
  const [started, setStarted] = useState(false);

  const [chatLog, setChatLog] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("chatLog");
    if (saved) setChatLog(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("chatLog", JSON.stringify(chatLog));
  }, [chatLog]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", text: input };
    setChatLog((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/chat", {
        message: input,
      });
      const botReply = { role: "bot", text: res.data.reply };
      setChatLog((prev) => [...prev, botReply]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Failed to get response." },
      ]);
    }
    setLoading(false);
  };

  const validateAndStart = () => {
    if (!userName.trim() || !mobile.trim()) {
      alert("Please fill all fields.");
      return;
    }
    if (!/^\d+$/.test(mobile)) {
      alert("Mobile number must contain only digits.");
      return;
    }
    setStarted(true);
  };

  const clearChat = () => {
    setChatLog([]);
    localStorage.removeItem("chatLog");
  };

  if (!started) {
    return (
      <div className="login-screen modern">
        <div className="card">
          <h1 className="title">📘 ICSE Banking Chat Tutor</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option>Banking</option>
          </select>
          <button onClick={validateAndStart}>Start Chat</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header>
        <h3>📘 ICSE Banking Chat Tutor</h3>
        <button onClick={clearChat}>🗑️ Clear Chat</button>
      </header>
      <div className="chat-box">
        {chatLog.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="bubble">
              <strong>{msg.role === "user" ? "You" : "Tutor"}:</strong>{" "}
              <span>{msg.text}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message bot">
            <div className="bubble">
              <strong>Tutor:</strong>{" "}
              <span className="dots">
                Thinking<span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="input-area">
        <input
          type="text"
          placeholder="Ask your Banking question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;
