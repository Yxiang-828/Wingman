import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom"; // ✅ ADD THIS
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import HumorSetting from "./HumorSetting";
import MessageBubble from "./MessageBubble";
import QuickReplies from "./QuickReplies";
import { getCurrentUserId } from "../../utils/auth"; // ✅ ADD THIS
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
          id: msg.id,
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
      const aiResponse = generateSimpleResponse(msg, humor);

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
  const generateSimpleResponse = (userMessage: string, humorMode: string): string => {
    const lowerMsg = userMessage.toLowerCase();
    
    // Simple keyword-based responses
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      return humorMode === 'funny' 
        ? "Hey there, productivity superstar! Ready to conquer the day? 🚀"
        : "Hello! I'm here to help you stay organized and focused.";
    }
    
    if (lowerMsg.includes('schedule') || lowerMsg.includes('calendar')) {
      return humorMode === 'funny'
        ? "Let's get your schedule sorted! Time to make those tasks tremble in fear! 📅"
        : "I can help you manage your schedule. Check your calendar view for upcoming events.";
    }
    
    if (lowerMsg.includes('task')) {
      return humorMode === 'funny'
        ? "Tasks, schmasks! Let's turn your to-do list into a to-DONE list! ✅"
        : "I can help you manage your tasks. You can add new tasks or view existing ones.";
    }
    
    if (lowerMsg.includes('diary') || lowerMsg.includes('journal')) {
      return humorMode === 'funny'
        ? "Diary time! Spill the tea about your day! ☕📝"
        : "Journaling is a great way to reflect. You can write in your diary anytime.";
    }
    
    if (lowerMsg.includes('joke')) {
      return "Why don't scientists trust atoms? Because they make up everything! 😄";
    }
    
    if (lowerMsg.includes('motivate')) {
      return humorMode === 'funny'
        ? "You're like a productivity ninja! Silent, swift, and getting stuff DONE! 🥷"
        : "You've got this! Every small step forward is progress worth celebrating.";
    }
    
    // Default responses
    const funnyResponses = [
      "Hmm, that's interesting! Tell me more! 🤔",
      "I'm processing that with my super-advanced AI brain... beep boop! 🤖",
      "That sounds important! How can I help you tackle it? 💪"
    ];
    
    const seriousResponses = [
      "I understand. How can I assist you with that?",
      "Thank you for sharing. What would you like to focus on next?",
      "I'm here to help. Can you provide more details?"
    ];
    
    const responses = humorMode === 'funny' ? funnyResponses : seriousResponses;
    return responses[Math.floor(Math.random() * responses.length)];
  };

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
        {loading && (
          <div className="loading-message">
            <MessageBubble
              sender="wingman"
              text="Thinking... 🤔"
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
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="chatbot-send-btn" disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
};

export default ChatBot;