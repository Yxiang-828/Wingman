import { useEffect, useRef, useState } from "react";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import HumorSetting from "./HumorSetting";
import "./ChatBot.css";

const moodIcons = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const moodLabels = {
  productive: "productive spirit",
  moody: "moody spirit",
};

type Message = {
  id: number;
  sender: "user" | "wingman";
  text: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    sender: "wingman",
    text: "Hey! I'm your Wingman. How can I help you today?",
  },
];

const ChatBot = () => {
  const [wingmanMood, setWingmanMood] = useState<"productive" | "moody">(
    "productive"
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [humor, setHumor] = useState<"serious" | "funny">("serious");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") {
          setWingmanMood(mood);
        }
      });
    }
  }, []);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Simulate LLM response (replace with real LLM call)
  const getLLMResponse = async (userMsg: string) => {
    // You can replace this with your LLM API call
    if (humor === "funny") {
      return "😄 That's hilarious! But here's what I think...";
    }
    return "Here's my thoughtful response!";
  };

  const handleSend = async (msg: string) => {
    if (!msg.trim()) return;
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: msg,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    // Simulate LLM response
    const response = await getLLMResponse(msg);
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, sender: "wingman", text: response },
    ]);
  };

  return (
    <section className="chatbot p-6 bg-dark rounded-lg shadow-md hover-glow-tile">
      <h1 className="text-light text-2xl font-semibold mb-4 flex items-center gap-3">
        <span className="mood-icon-tooltip">
          <img
            src={moodIcons[wingmanMood] || productiveIcon}
            alt={wingmanMood}
            className={
              wingmanMood === "productive" ? "run-away-on-hover" : "icon-rotate"
            }
            style={{ width: 38, height: 38, borderRadius: "50%" }}
          />
          <span className="mood-tooltip-text">
            {moodLabels[wingmanMood] || "productive spirit"}
          </span>
        </span>
        Wingman
      </h1>
      <HumorSetting humor={humor} setHumor={setHumor} />
      <div ref={chatBoxRef} className="chatbot-messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} sender={msg.sender} text={msg.text} />
        ))}
        <div ref={chatEndRef} />
      </div>
      <QuickReplies onQuickReply={handleSend} />
      <form
        className="chatbot-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
      >
        <input
          className="chatbot-input"
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="action-btn chatbot-send-btn">
          <span>📤</span>
        </button>
      </form>
    </section>
  );
};

export default ChatBot;
