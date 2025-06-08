import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

/**
 * ChatCard Component - Your Wingman's Communication Portal
 * Quick access to start conversations with your loyal AI assistant
 * Features instant navigation to full chat interface with message forwarding
 */
const ChatCard: React.FC = () => {
  const [chatInput, setChatInput] = useState("");
  const navigate = useNavigate();

  /**
   * Handles command submission to your Wingman
   * Forwards initial message to the main chat interface for processing
   */
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
        <h2>Command Your Wingman</h2>
      </div>
      <div className="chat-preview">
        <p>Your loyal assistant awaits your orders, boss</p>
      </div>
      <form onSubmit={handleChatSubmit} className="chat-form">
        <input
          type="text"
          placeholder="Give me a command, boss..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="chat-input"
          aria-label="Type command for your Wingman"
        />
        <button
          type="submit"
          className="chat-submit"
          aria-label="Send command to Wingman"
        >
          Deploy
        </button>
      </form>
    </div>
  );
};

export default ChatCard;
