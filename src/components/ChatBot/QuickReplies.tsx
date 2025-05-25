import React from "react";
import "./ChatBot.css";

const quickReplies = [
  "Tell me a joke",
  "Give me advice",
  "How's my schedule?",
  "Motivate me!",
];

interface QuickRepliesProps {
  onQuickReply: (msg: string) => void;
}

const QuickReplies: React.FC<QuickRepliesProps> = ({ onQuickReply }) => (
  <div className="chatbot-quick-replies">
    {quickReplies.map((reply, idx) => (
      <button
        key={idx}
        className="chatbot-quick-reply"
        onClick={() => onQuickReply(reply)}
        type="button"
      >
        {reply}
      </button>
    ))}
  </div>
);

export default QuickReplies;