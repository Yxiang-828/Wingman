import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import { getCurrentUserId } from "../../utils/auth";
import llmService from "../../services/llmService";
import "./ChatBot.css";
import { themePersonalityMap } from "../../constants/themePersonalitymap";

/**
 * Message interface for conversation tracking between user and Wingman
 * Maintains conversation history with proper metadata
 */
interface Message {
  id: number;
  sender: "user" | "wingman";
  text: string;
  timestamp: string;
}

/**
 * Initial greeting from   Wingman
 */
const initialMessages: Message[] = [
  {
    id: 1,
    sender: "wingman" as "user" | "wingman",
    text: "At your service! Your loyal Wingman reporting for duty. What can I help you conquer today? 🎯\n\n**New here?** Type `/guide` for a complete setup walkthrough, or `/manual` to access my full capabilities!",
    timestamp: new Date().toISOString(),
  },
];

/**
 * ChatBot Component
 * Features persistent memory, mood awareness
 * mapped to the user's theme settings
 */
const ChatBot = () => {
  // Core state management for  Wingman's personality and conversation
  const [wingmanMood, setWingmanMood] = useState<"productive" | "moody">(
    "productive",
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [showHistory, setShowHistory] = useState(false);
  const [wingmanName, setWingmanName] = useState("Your Wingman");
  const savedSettings = localStorage.getItem("userSettings");
  let themeData = themePersonalityMap["dark"];
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      const theme = (settings.theme ||
        "dark") as keyof typeof themePersonalityMap;
      themeData = themePersonalityMap[theme] || themePersonalityMap["dark"];
    } catch {
      themeData = themePersonalityMap["dark"];
    }
  }
  useEffect(() => {
    // Helper to update the Wingman name from localStorage
    const updateWingmanName = () => {
      const savedSettings = localStorage.getItem("userSettings");
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          const theme = (settings.theme ||
            "dark") as keyof typeof themePersonalityMap;
          const themeData = themePersonalityMap[theme];
          setWingmanName(themeData?.name || "Your Wingman");
        } catch {
          setWingmanName("Your Wingman");
        }
      } else {
        setWingmanName("Your Wingman");
      }
    };

    // Initial load
    updateWingmanName();

    // Listen for custom event (same-tab updates)
    const handleThemeUpdate = () => {
      updateWingmanName();
    };
    window.addEventListener("wingman-theme-updated", handleThemeUpdate);

    // Listen for storage event (cross-tab updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "userSettings") {
        updateWingmanName();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("wingman-theme-updated", handleThemeUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  // DOM references for smooth interaction management
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const initialMessageHandled = useRef(false);

  /**
   * Initialize conversation history on component mount
   */
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      loadChatHistory(userId);
    }
  }, []);

  /**
   * Loads conversation history from Wingman's memory
   */
  const loadChatHistory = async (userId: string) => {
    try {
      console.log("Wingman: Loading your conversation history...");

      const history = await window.electronAPI.db.getChatHistory(userId, 50);

      if (history && history.length > 0) {
        const formattedMessages: Message[] = history.map((msg) => ({
          id: parseInt(msg.id, 10),
          sender: msg.is_ai ? "wingman" : "user",
          text: msg.message,
          timestamp: msg.timestamp,
        }));

        if (formattedMessages.length > 0) {
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error("Wingman: Failed to load chat history:", error);
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

  /**
   * Auto-scroll management for smooth conversation flow
   * Ensures latest  responses stay visible
   */
  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /**
   * Handles deep-link messages from other components
   */
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && !initialMessageHandled.current) {
      handleSend(initialMessage);
      initialMessageHandled.current = true;
    }
  }, [location.state?.initialMessage]);

  /**
   * Handles user input, AI response generation, and conversation persistence
   */
  const handleSend = async (msg: string) => {
    console.log("[ChatBot] handleSend called with message:", msg);
    if (!msg.trim()) {
      console.log("[ChatBot] Message is empty, aborting send.");
      return;
    }

    // Handle special /guide command for new users
    if (msg.trim().toLowerCase() === "/guide") {
      const guideMessage: Message = {
        id: Date.now(),
        text: `🚀 **Welcome to Wingman Setup Guide!**

Here's how to get your AI companion fully configured:

**Step 1: Download & Select AI Model**
• Go to Profile → Settings → Model Manager
• Click "Download Models" to see available AI models
• Download your preferred model (Mistral recommended)
• Select it as your active chat model
• Now you have intelligent conversations!

**Step 2: Choose Your Theme**
• In Profile → Settings → Avatar Selection
• Select from 6 unique themes:
  - Dark, Light (classic)
  - Yandere, Kuudere, Tsundere, Dandere (anime personalities!)
• Each theme gives your Wingman a unique personality!

**Step 3: Explore Features**
• 📓 Smart diary with mood tracking
• 📅 Intelligent calendar with time blocking  
• ✅ Task management with recurring tasks
• 💬 This AI chat (powered by your selected model)

**Pro Tips:**
• Everything works offline with cloud sync
• Press Ctrl + - to resize if app looks too big
• Try different themes for unique AI personalities!
• All models run locally - your data stays private!

Type any message to start chatting, or use /guide anytime for this help! 🎯`,
        sender: "wingman",
        timestamp: new Date().toISOString(),
      };

      const userMessage: Message = {
        id: Date.now() - 1,
        text: "/guide",
        sender: "user",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, guideMessage]);
      return;
    }

    const userId = getCurrentUserId();
    console.log("[ChatBot] Current userId:", userId);
    if (!userId) {
      alert("Boss, I need you to log in first so I can save our conversation!");
      console.log("[ChatBot] No userId found, aborting send.");
      return;
    }

    setLoading(true);
    console.log("[ChatBot] Loading state set to true.");
    const timestamp = new Date().toISOString();
    console.log("[ChatBot] Timestamp for user message:", timestamp);

    // Create and display
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: msg,
      timestamp,
    };
    console.log("[ChatBot] Adding user message to state:", userMessage);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    console.log("[ChatBot] Input cleared.");

    try {
      // Generate  Wingman's response
      console.log("[ChatBot] Calling generateAIResponse...");
      const aiResponse = await generateAIResponse(msg, userId);
      console.log("[ChatBot] AI response received:", aiResponse);

      // Display  Wingman's response
      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: aiResponse,
        timestamp: new Date().toISOString(),
      };
      console.log("[ChatBot] Adding AI message to state:", botMessage);

      setMessages((prev) => [...prev, botMessage]);
      console.log("[ChatBot] Messages state updated with AI response.");

      console.log("Wingman: Mission accomplished - conversation saved!");
    } catch (error) {
      console.error("Wingman: Error processing your command:", error);

      //  Wingman handles failures gracefully
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: "Apologies, boss! I encountered a glitch while processing your command. Your loyal Wingman is still learning. Please try again, just kidding, please go find the damn problem!",
        timestamp: new Date().toISOString(),
      };
      console.log("[ChatBot] Adding error message to state:", errorMessage);

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      console.log("[ChatBot] Loading state set to false.");

      // Return focus for  next request
      setTimeout(() => {
        inputRef.current?.focus();
        console.log("[ChatBot] Input ref focused for next command.");
      }, 100);
    }
  };

  /**
   * Processes commands through advanced language models
   * Performance metrics logged for optimization tracking
   */
  const generateAIResponse = async (
    message: string,
    userId: string,
  ): Promise<string> => {
    console.log("[ChatBot] generateAIResponse called with:", {
      message,
      userId,
    });

    try {
      setLoading(true);
      console.log("[ChatBot] Loading state set to true (AI response).");
      console.log("[ChatBot] Sending message to llmService...");

      const result = await llmService.sendMessage(message, userId);
      console.log("[ChatBot] llmService.sendMessage result:", result);

      // Log response metrics for performance analysis
      if (result.model_used && result.processing_time) {
        console.log(
          `Wingman Brain (${
            result.model_used
          }): Responded in ${result.processing_time.toFixed(2)}s`,
        );
      }
      console.log("[ChatBot] Returning AI response:", result.response);

      return result.response;
    } catch (error) {
      console.error("Wingman AI Error:", error);
      return "Boss, my AI brain is taking a quick break! Your faithful Wingman is still here though. Please try again in a moment!";
    } finally {
      setLoading(false);
      console.log("[ChatBot] Loading state set to false (AI response).");
    }
  };

  /**
   * Clears the conversation history
   */
  const clearChatHistory = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await window.electronAPI.db.clearChatHistory(userId);
      setMessages(initialMessages);
      console.log("Wingman: Chat history cleared as requested, boss!");

      // Force reload of the component after clearing chat history
      // This ensures the UI and state are fully in sync
      loadChatHistory(userId);
    } catch (error) {
      console.error("Wingman: Failed to clear chat history:", error);
    }
  };

  /**
   * Checks AI status periodically
   */
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const status = await llmService.getStatus();
        setAiStatus(status.available ? "online" : "offline");
      } catch (error) {
        setAiStatus("offline");
      }
    };

    checkAIStatus();

    // Health checks every 30 seconds
    const interval = setInterval(checkAIStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * translates AI status into homo-sapien text
   */
  const getStatusText = () => {
    switch (aiStatus) {
      case "checking":
        return "Booting up for duty...";
      case "online":
        return "Ready to serve, boss!";
      case "offline":
        return "AI brain offline - manual mode";
      default:
        return "Status unknown";
    }
  };

  /**
   * Form submission handler with command validation
   * Prevents empty commands from reaching  Wingman (big bug)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className="chatbot-container">
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="wingman-avatar-container">
            <img
              src={themeData?.avatar}
              alt={`Your loyal Wingman in ${wingmanMood} mood`}
              className="wingman-mood-icon"
            />
          </div>
          <div className="wingman-info">
            <h1 className="wingman-title">{wingmanName}</h1>{" "}
            <div className="ai-status">
              <span className={`status-dot ${aiStatus}`}></span>
              <span className="status-text">{getStatusText()}</span>
            </div>
          </div>
        </div>

        <div className="chatbot-header-actions">
          <button
            className={`header-action-btn ${showHistory ? "active" : ""}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Configure your Wingman"
            aria-label="Toggle Wingman settings"
          >
            ⚙️
          </button>
          <button
            className="header-action-btn"
            onClick={clearChatHistory}
            title="Clear our conversation history"
            aria-label="Clear conversation history"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Wingman Configuration Panel */}
      {showHistory && (
        <div className="chatbot-settings-panel">
          {/* <HumorSetting humor={humor} setHumor={setHumor} /> */}
          <div className="chat-stats">
            <span className="stat-item">💬 {messages.length} exchanges</span>
            <span className="stat-item">
              🤖 {messages.filter((m) => m.sender === "wingman").length}{" "}
              responses served
            </span>
          </div>
        </div>
      )}

      {/* Main Conversation Panel */}
      <div className="chatbot-main">
        <div ref={chatBoxRef} className="chatbot-messages">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              sender={message.sender}
              text={message.text}
              timestamp={message.timestamp}
            />
          ))}
          {loading && (
            <div className="loading-message">
              <MessageBubble
                sender="wingman"
                text="Processing your command, boss..."
                timestamp={new Date().toISOString()}
              />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Actions Panel */}
        <QuickReplies onQuickReply={handleSend} />

        {/*  Input Console */}
        <div className="chatbot-input-area">
          <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <input
                ref={inputRef}
                className="chatbot-input"
                type="text"
                placeholder="Give me your command, boss..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                autoFocus
                aria-label="Type your command"
              />
              <button
                type="submit"
                className={`chatbot-send-btn ${
                  loading || !input.trim() ? "disabled" : ""
                }`}
                disabled={loading || !input.trim()}
                title="Send command to your Wingman"
                aria-label="Send command"
              >
                {loading ? "⏳" : "🚀"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
