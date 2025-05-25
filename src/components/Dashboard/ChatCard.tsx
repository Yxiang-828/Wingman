import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const ChatCard: React.FC = () => {
  const [chatInput, setChatInput] = useState("");
  const navigate = useNavigate();

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      navigate("/chatbot", { state: { initialMessage: chatInput } });
      setChatInput("");
    }
  };

  return (
    <div className="dashboard-card chat-card">
      <div className="dashboard-card-header">
        <h2>Talk to Wingman</h2>
      </div>
      <div className="chat-preview">
        <p>How can I help you today?</p>
      </div>
      <form onSubmit={handleChatSubmit} className="chat-form">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="chat-input"
        />
        <button type="submit" className="chat-submit">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatCard;
