import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import productiveIcon from "../../assets/icons/productive.png";
import moodyIcon from "../../assets/icons/moody.png";
import HumorSetting from "./HumorSetting";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import { getCurrentUserId } from "../../utils/auth";
import llmService from "../../services/llmService";
import "./ChatBot.css";

/**
 * Mood system configuration for your loyal Wingman's avatar
 * Maps different moods to visual assets for personality display
 */
const moodIcons = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const moodLabels = {
  productive: "productive spirit",
  moody: "moody spirit",
};

/**
 * Message interface for conversation tracking between boss and Wingman
 * Maintains conversation history with proper metadata
 */
interface Message {
  id: number;
  sender: "user" | "wingman";
  text: string;
  timestamp: string;
}

/**
 * Initial greeting from your faithful Wingman
 * Sets the tone for an obedient yet capable AI assistant
 */
const initialMessages: Message[] = [
  {
    id: 1,
    sender: "wingman" as "user" | "wingman",
    text: "At your service! Your loyal Wingman reporting for duty. What can I help you conquer today?",
    timestamp: new Date().toISOString(),
  },
];

/**
 * ChatBot Component - Your Personal Wingman Interface
 * Main conversational hub where your AI assistant awaits orders
 * Features persistent memory, mood awareness, and unwavering loyalty
 * Like having a digital Viking companion who never questions your commands
 */
const ChatBot = () => {
  // Core state management for your Wingman's personality and conversation
  const [wingmanMood, setWingmanMood] = useState<"productive" | "moody">("productive");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [humor, setHumor] = useState<"serious" | "funny">("serious");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [showHistory, setShowHistory] = useState(false);

  // DOM references for smooth interaction management
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const initialMessageHandled = useRef(false);

  /**
   * Initialize conversation history on component mount
   * Your Wingman remembers everything - no detail forgotten
   */
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      loadChatHistory(userId);
    }
  }, []);

  /**
   * Loads conversation history from your Wingman's memory banks
   * Restores up to 50 recent exchanges for seamless continuity
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

  /**
   * Listens for mood changes from external sources
   * Your Wingman adapts personality based on your current state
   */
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
   * Ensures your latest commands and responses stay visible
   */
  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /**
   * Handles deep-link messages from other components
   * Allows seamless integration across your command center
   */
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && !initialMessageHandled.current) {
      handleSend(initialMessage);
      initialMessageHandled.current = true;
    }
  }, [location.state?.initialMessage]);

  /**
   * Main command processing hub - where your orders become reality
   * Handles user input, AI response generation, and conversation persistence
   * Your Wingman processes every command with dedication and precision
   */
  const handleSend = async (msg: string) => {
    if (!msg.trim()) return;

    const userId = getCurrentUserId();
    if (!userId) {
      alert("Boss, I need you to log in first so I can save our conversation!");
      return;
    }

    setLoading(true);
    const timestamp = new Date().toISOString();

    // Create and display your command immediately
    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: msg,
      timestamp,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      // Archive your command in Wingman's memory
      await window.electronAPI.db.saveChatMessage(msg, false, userId);

      // Generate your Wingman's response
      const aiResponse = await generateAIResponse(msg, userId);

      // Archive Wingman's response for future reference
      await window.electronAPI.db.saveChatMessage(aiResponse, true, userId);

      // Display your Wingman's response
      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);

      console.log("Wingman: Mission accomplished - conversation saved!");
    } catch (error) {
      console.error("Wingman: Error processing your command:", error);

      // Your Wingman handles failures gracefully
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "wingman",
        text: "Apologies, boss! I encountered a glitch while processing your command. Your loyal Wingman is still learning. Please try again!",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // Return focus for your next command
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  /**
   * AI response generation using your Wingman's neural networks
   * Processes commands through advanced language models
   * Performance metrics logged for optimization tracking
   */
  const generateAIResponse = async (
    message: string,
    userId: string
  ): Promise<string> => {
    try {
      setLoading(true);

      const result = await llmService.sendMessage(message, userId);

      // Log response metrics for performance analysis
      if (result.model_used && result.processing_time) {
        console.log(
          `Wingman Brain (${result.model_used}): Responded in ${result.processing_time.toFixed(2)}s`
        );
      }

      return result.response;
    } catch (error) {
      console.error("Wingman AI Error:", error);
      return "Boss, my AI brain is taking a quick break! Your faithful Wingman is still here though. Please try again in a moment!";
    } finally {
      setLoading(false);
    }
  };

  /**
   * Conversation history clearing with boss approval
   * Your Wingman forgets nothing unless explicitly commanded
   */
  const clearChatHistory = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await window.electronAPI.db.clearChatHistory(userId);
      setMessages(initialMessages);
      console.log("Wingman: Chat history cleared as requested, boss!");
    } catch (error) {
      console.error("Wingman: Failed to clear chat history:", error);
    }
  };

  /**
   * AI service health monitoring with periodic status checks
   * Keeps you informed of your Wingman's operational readiness
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
   * Status translation for human-readable feedback
   * Your Wingman communicates readiness in clear terms
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
   * Prevents empty commands from reaching your Wingman
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className="chatbot-container">
      {/* Command Center Header - Your Wingman's Identity Hub */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="wingman-avatar-container">
            <img
              src={moodIcons[wingmanMood]}
              alt={`Your loyal Wingman in ${moodLabels[wingmanMood]} mood`}
              className="wingman-mood-icon"
            />
          </div>
          <div className="wingman-info">
            <h1 className="wingman-title">Your Wingman</h1>
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
          <HumorSetting humor={humor} setHumor={setHumor} />
          <div className="chat-stats">
            <span className="stat-item">💬 {messages.length} exchanges</span>
            <span className="stat-item">
              🤖 {messages.filter((m) => m.sender === "wingman").length} responses served
            </span>
          </div>
        </div>
      )}

      {/* Main Conversation Theater */}
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

        {/* Quick Command Arsenal */}
        <QuickReplies onQuickReply={handleSend} />

        {/* Command Input Console */}
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
