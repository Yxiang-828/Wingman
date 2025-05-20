import React from "react";
import "./ChatBot.css";

interface MessageBubbleProps {
  sender: "user" | "wingman";
  text: string;
  className?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  text,
  className,
}) => (
  <div
    className={`chatbot-bubble ${sender === "user" ? "user" : "wingman"} ${
      className ? className : ""
    }`}
  >
    {text}
  </div>
);

export default MessageBubble;
