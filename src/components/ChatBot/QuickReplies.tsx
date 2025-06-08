import React, { useState, useEffect } from "react";
import { getCurrentUserId } from "../../utils/auth";
import "./ChatBot.css";

/**
 * QuickPrompt interface for user-defined conversation shortcuts
 * Tracks usage statistics for intelligent reordering
 */
interface QuickPrompt {
  id: number;
  prompt_text: string;
  usage_count: number;
}

interface QuickRepliesProps {
  onQuickReply: (msg: string) => void;
}

/**
 * QuickReplies Component
 * Manages user-customizable conversation shortcuts with usage tracking
 * Supports up to 4 custom prompts with persistent storage
 * Features inline editing and usage-based sorting
 */
const QuickReplies: React.FC<QuickRepliesProps> = ({ onQuickReply }) => {
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Loads user's custom quick prompts from database
   * Automatically sorted by usage frequency
   */
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

  /**
   * Handles quick reply selection with usage tracking
   * Updates statistics and refreshes order based on frequency
   */
  const handleQuickReply = async (prompt: QuickPrompt) => {
    try {
      // Update usage statistics in database
      await window.electronAPI.db.updateQuickPromptUsage(prompt.id);
      
      // Send the message to chat
      onQuickReply(prompt.prompt_text);
      
      // Refresh prompts to update usage-based ordering
      loadQuickPrompts();
    } catch (error) {
      console.error("Failed to use quick prompt:", error);
      // Send message even if stats update fails to maintain UX
      onQuickReply(prompt.prompt_text);
    }
  };

  /**
   * Creates new custom prompt with validation
   * Enforces 4-prompt limit and text requirements
   */
  const handleAddNewPrompt = async () => {
    if (!newPrompt.trim()) return;
    
    try {
      setLoading(true);
      const userId = getCurrentUserId();
      if (!userId) return;

      await window.electronAPI.db.saveQuickPrompt(userId, newPrompt.trim());
      
      // Reset form state
      setNewPrompt("");
      setIsAddingNew(false);
      loadQuickPrompts();
    } catch (error) {
      console.error("Failed to save quick prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Removes custom prompt with event bubbling prevention
   * Prevents triggering parent click handlers
   */
  const handleDeletePrompt = async (promptId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await window.electronAPI.db.deleteQuickPrompt(promptId);
      loadQuickPrompts();
    } catch (error) {
      console.error("Failed to delete quick prompt:", error);
    }
  };

  /**
   * Handles keyboard navigation for form inputs
   * Supports Enter to save, Escape to cancel
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddNewPrompt();
    if (e.key === 'Escape') {
      setIsAddingNew(false);
      setNewPrompt("");
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
          title={quickPrompts.length >= 4 ? "Maximum commands reached" : "Add new command"}
          aria-label={`Add new quick reply. ${quickPrompts.length} of 4 slots used.`}
        >
          {quickPrompts.length >= 4 ? "4/4" : `${quickPrompts.length}/4`} +
        </button>
      </div>

      <div className="quick-replies-grid">
        {/* Existing custom prompts with usage tracking */}
        {quickPrompts.map((prompt) => (
          <div key={prompt.id} className="chatbot-quick-reply-wrapper">
            <button
              className="chatbot-quick-reply custom-prompt"
              onClick={() => handleQuickReply(prompt)}
              title={`Used ${prompt.usage_count} times`}
              aria-label={`Quick reply: ${prompt.prompt_text}. Used ${prompt.usage_count} times.`}
            >
              <span className="prompt-text">{prompt.prompt_text}</span>
              <span className="usage-badge">{prompt.usage_count}</span>
            </button>
            <button
              className="delete-prompt-btn"
              onClick={(e) => handleDeletePrompt(prompt.id, e)}
              title="Remove this command"
              aria-label={`Delete quick reply: ${prompt.prompt_text}`}
            >
              ×
            </button>
          </div>
        ))}

        {/* Inline form for adding new prompts */}
        {isAddingNew && (
          <div className="add-prompt-form">
            <input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Enter your custom command..."
              maxLength={50}
              autoFocus
              onKeyDown={handleKeyDown}
              className="new-prompt-input"
              aria-label="Enter new quick reply text"
            />
            <div className="add-prompt-actions">
              <button
                onClick={handleAddNewPrompt}
                disabled={!newPrompt.trim() || loading}
                className="save-prompt-btn"
                title="Save new command"
                aria-label="Save new quick reply"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewPrompt("");
                }}
                className="cancel-prompt-btn"
                title="Cancel adding command"
                aria-label="Cancel new quick reply"
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