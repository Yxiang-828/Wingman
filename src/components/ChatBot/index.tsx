import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import HumorSetting from "./HumorSetting";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import { fetchChatHistory, sendChatMessage } from "../../api/chat";
import "./ChatBot.css";

const moodIcons = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const moodLabels = {
  productive: "productive spirit",
  moody: "moody spirit",
};

// Keep the Message interface that's actually used:
interface Message {
  id: number;
  sender: "user" | "wingman"; // Strict union type
  text: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    sender: "wingman" as "user" | "wingman",
    text: "Hey! I'm your Wingman. How can I help you today?",
    timestamp: new Date().toISOString(),
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
  const location = useLocation();
  const initialMessageHandled = useRef(false);
  const [user, setUser] = useState<any>(() => {
    const storedUser = localStorage.getItem("wingmanUser");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    // Initialize from Supabase if user exists
    if (user) {
      loadChatHistory(user.id);
    }
  }, [user]);

  // Load chat history from Supabase
  const loadChatHistory = async (userId: string) => {
    try {
      console.log("Loading chat history from Supabase for user:", userId);
      const history = await fetchChatHistory(userId);

      if (history && history.length > 0) {
        // Format the messages for display
        const formattedMessages: Message[] = history.map((msg) => ({
          id: msg.id,
          sender: msg.user_id === "wingman" ? "wingman" : "user",
          text: msg.message,
          timestamp: msg.timestamp,
        }));

        // Only replace initial messages if we have chat history
        if (formattedMessages.length > 0) {
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") {
          setWingmanMood(mood as "productive" | "moody");
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

  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && !initialMessageHandled.current) {
      handleSend(initialMessage);
      initialMessageHandled.current = true;
    }
    // eslint-disable-next-line
  }, [location.state?.initialMessage]);

  // Send message and get response
  const handleSend = async (msg: string) => {
    if (!msg.trim()) return;

    // If no user is logged in, we can't save to Supabase
    if (!user) {
      alert("Please log in to save your chat history.");
      return;
    }

    const timestamp = new Date().toISOString();

    // Create user message object
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: msg,
      timestamp,
    };

    // Add to local state
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // Send message to backend and get LLM response
      const response = await sendChatMessage(user.id, msg, timestamp);

      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text:
          typeof response.response === "string"
            ? response.response
            : "Sorry, I didn't understand that.",
        timestamp: new Date().toISOString(),
      };

      // Add bot response to local state
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message if API call fails
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: "Sorry, I encountered an error. Please try again later.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  useEffect(() => {
    // Example usage
    const storedUser = localStorage.getItem("wingmanUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <section className="chatbot p-6 bg-dark rounded-lg shadow-md hover-glow-tile">
      <h1 className="text-light text-2xl font-semibold mb-4 flex items-center gap-3">
        <img
          src={moodIcons[wingmanMood]}
          alt={`Wingman in ${moodLabels[wingmanMood]} mood`}
          className="mood-icon"
          style={{ width: "32px", height: "32px" }}
        />
        Wingman
      </h1>
      <HumorSetting humor={humor} setHumor={setHumor} />
      <div ref={chatBoxRef} className="chatbot-messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            sender={message.sender}
            text={message.text}
          />
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
        <button type="submit" className="chatbot-send-btn">
          Send
        </button>
      </form>
    </section>
  );
};

export default ChatBot;
