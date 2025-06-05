import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom"; // ✅ ADD THIS
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import HumorSetting from "./HumorSetting";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import { getCurrentUserId } from "../../utils/auth"; // ✅ ADD THIS
import llmService from '../../services/llmService';
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
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const initialMessageHandled = useRef(false);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      loadChatHistory(userId);
    }
  }, []);

  // ✅ MIGRATED: Load chat history from SQLite
  const loadChatHistory = async (userId: string) => {
    try {
      console.log("Loading chat history from SQLite for user:", userId);
      
      // ✅ NEW: Use SQLite via electronAPI instead of deprecated API
      const history = await window.electronAPI.db.getChatHistory(userId, 50);

      if (history && history.length > 0) {
        // Format the messages for display
        const formattedMessages: Message[] = history.map((msg) => ({
          id: parseInt(msg.id, 10),
          sender: msg.is_ai ? "wingman" : "user",
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
      // Keep initial messages on error
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

  // ✅ MIGRATED: Send message and get response using SQLite
  const handleSend = async (msg: string) => {
    if (!msg.trim()) return;

    const userId = getCurrentUserId();
    if (!userId) {
      alert("Please log in to save your chat history.");
      return;
    }

    setLoading(true);
    const timestamp = new Date().toISOString();

    // Create user message object
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: msg,
      timestamp,
    };

    // Add to local state immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // ✅ NEW: Save user message to SQLite
      await window.electronAPI.db.saveChatMessage(msg, false, userId);

      // ✅ TODO: Integrate with your LLM service for AI response
      // For now, create a simple response
      const aiResponse = await generateAIResponse(msg, userId);

      // ✅ NEW: Save AI response to SQLite
      await window.electronAPI.db.saveChatMessage(aiResponse, true, userId);

      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: aiResponse,
        timestamp: new Date().toISOString(),
      };

      // Add bot response to local state
      setMessages((prev) => [...prev, botMessage]);

      console.log("✅ Chat messages saved to SQLite successfully");
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message if SQLite operation fails
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: "Sorry, I encountered an error. Please try again later.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ HELPER: Simple response generator (replace with your LLM service)
  const generateAIResponse = async (message: string, userId: string): Promise<string> => {
    try {
      setLoading(true);
      
      const result = await llmService.sendMessage(message, userId);
      
      // Show performance info in console
      if (result.model_used && result.processing_time) {
        console.log(`🤖 ${result.model_used} responded in ${result.processing_time.toFixed(2)}s`);
      }
      
      return result.response;
      
    } catch (error) {
      console.error('AI Error:', error);
      return "I'm having trouble thinking right now. Please try again in a moment!";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const status = await llmService.getStatus();
        setAiStatus(status.available ? 'online' : 'offline');
      } catch (error) {
        setAiStatus('offline');
      }
    };

    checkAIStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkAIStatus, 30000);
    return () => clearInterval(interval);
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
      <div className="ai-status">
        <span className={`status-dot ${aiStatus}`}></span>
        <span className="status-text">
          {aiStatus === 'checking' && "🔄 Wingman's sweating it out..."}
          {aiStatus === 'online' && "🤖 Wingman's at your command!"}
          {aiStatus === 'offline' && "⚠️ Wingman's Sleeping..."}
        </span>
      </div>
      <HumorSetting humor={humor} setHumor={setHumor} />
      <div ref={chatBoxRef} className="chatbot-messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            sender={message.sender}
            text={message.text}
          />
        ))}
        {loading && (
          <div className="loading-message">
            <MessageBubble
              sender="wingman"
              text="Cooking... 🤔"
            />
          </div>
        )}
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
          placeholder="Wingman's at your command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="chatbot-send-btn" disabled={loading || !input.trim()}>
          {loading ? "Hold on..." : "Send"}
        </button>
      </form>
    </section>
  );
};

export default ChatBot;