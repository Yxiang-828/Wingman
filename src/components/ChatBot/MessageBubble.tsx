import React from "react";
import "./ChatBot.css";

interface MessageBubbleProps {
  sender: "user" | "wingman";
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ sender, text }) => (
  <div className={`chatbot-bubble ${sender === "user" ? "user" : "wingman"}`}>
    {text}
  </div>
);

export default MessageBubble;