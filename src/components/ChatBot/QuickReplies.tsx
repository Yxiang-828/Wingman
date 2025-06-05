import React, { useState, useEffect } from "react";
import { getCurrentUserId } from "../../utils/auth";
import "./ChatBot.css";

interface QuickPrompt {
  id: number;
  prompt_text: string;
  usage_count: number;
}

interface QuickRepliesProps {
  onQuickReply: (msg: string) => void;
}

const QuickReplies: React.FC<QuickRepliesProps> = ({ onQuickReply }) => {
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // Load user's custom quick prompts
  useEffect(() => {
    loadQuickPrompts();
  }, []);

  const loadQuickPrompts = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const prompts = await window.electronAPI.db.getQuickPrompts(userId);
      setQuickPrompts(prompts || []);
    } catch (error) {
      console.error("Failed to load quick prompts:", error);
    }
  };

  const handleQuickReply = async (prompt: QuickPrompt) => {
    try {
      // Update usage stats
      await window.electronAPI.db.updateQuickPromptUsage(prompt.id);
      
      // Send the message
      onQuickReply(prompt.prompt_text);
      
      // Refresh prompts to update order
      loadQuickPrompts();
    } catch (error) {
      console.error("Failed to use quick prompt:", error);
      // Still send the message even if stats update fails
      onQuickReply(prompt.prompt_text);
    }
  };

  const handleAddNewPrompt = async () => {
    if (!newPrompt.trim()) return;
    
    try {
      setLoading(true);
      const userId = getCurrentUserId();
      if (!userId) return;

      await window.electronAPI.db.saveQuickPrompt(userId, newPrompt.trim());
      
      setNewPrompt("");
      setIsAddingNew(false);
      loadQuickPrompts();
    } catch (error) {
      console.error("Failed to save quick prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrompt = async (promptId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await window.electronAPI.db.deleteQuickPrompt(promptId);
      loadQuickPrompts();
    } catch (error) {
      console.error("Failed to delete quick prompt:", error);
    }
  };

  return (
    <div className="chatbot-quick-replies">
      <div className="quick-replies-header">
        <span className="quick-replies-title">Ready to Serve</span>
        <button
          className="add-prompt-btn"
          onClick={() => setIsAddingNew(true)}
          disabled={isAddingNew || quickPrompts.length >= 4}
          title={quickPrompts.length >= 4 ? "Maximum commands reached, boss!" : "Teach me a new command!"}
        >
          {quickPrompts.length >= 4 ? "4/4" : `${quickPrompts.length}/4`} +
        </button>
      </div>

      <div className="quick-replies-grid">
        {quickPrompts.map((prompt) => (
          <div key={prompt.id} className="chatbot-quick-reply-wrapper">
            <button
              className="chatbot-quick-reply custom-prompt"
              onClick={() => handleQuickReply(prompt)}
              title={`Used ${prompt.usage_count} times - Your wish is my command!`}
            >
              <span className="prompt-text">{prompt.prompt_text}</span>
              <span className="usage-badge">{prompt.usage_count}</span>
            </button>
            <button
              className="delete-prompt-btn"
              onClick={(e) => handleDeletePrompt(prompt.id, e)}
              title="Remove this command"
            >
              ×
            </button>
          </div>
        ))}

        {isAddingNew && (
          <div className="add-prompt-form">
            <input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="What would you like me to remember, boss?"
              maxLength={50}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNewPrompt();
                if (e.key === 'Escape') {
                  setIsAddingNew(false);
                  setNewPrompt("");
                }
              }}
              className="new-prompt-input"
            />
            <div className="add-prompt-actions">
              <button
                onClick={handleAddNewPrompt}
                disabled={!newPrompt.trim() || loading}
                className="save-prompt-btn"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewPrompt("");
                }}
                className="cancel-prompt-btn"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickReplies;