import React from "react";
import "./ChatBot.css";

interface MessageBubbleProps {
  sender: "user" | "wingman";
  text: string;
  timestamp?: string;
}

/**
 * MessageBubble Component
 * Renders individual chat messages with timestamps and sender-specific styling
 * Provides intelligent time formatting and accessibility features
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  text,
  timestamp,
}) => {
  /**
   * Formats timestamp into human-readable relative time
   * Provides contextual time display (just now, minutes ago, hours ago, date)
   */
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    return date.toLocaleDateString();
  };

  /**
   * Provides visual prefix for different message types
   * Distinguishes between AI responses and user messages
   */
  const getMessagePrefix = () => {
    if (sender === "wingman") {
      return "🤖 "; // AI assistant indicator
    }
    return ""; // Boss messages need no prefix
  };

  return (
    <div className={`chatbot-bubble ${sender}`}>
      <div className="message-content">
        {getMessagePrefix()}
        {text}
      </div>
      {timestamp && (
        <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
      )}
    </div>
  );
};

export default MessageBubble;
