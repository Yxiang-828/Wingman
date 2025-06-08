import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import "./DiaryEntry.css";

/**
 * Writing prompts to inspire journaling and self-reflection
 * Your Wingman provides thoughtful conversation starters
 */
const WRITING_PROMPTS = [
  "What made you smile today, boss?",
  "What's one thing you learned recently?",
  "How would you describe your current mood in detail?",
  "What's something you're looking forward to?",
  "What's something you'd like to improve about yourself?",
  "What are you grateful for today?",
  "What was the best part of your day?",
  "What challenge did you overcome recently?",
  "What do you need right now that you're not getting?",
  "If today was perfect, how would it have gone?",
  "What's something you're proud of accomplishing recently?",
  "Describe a recent interaction that impacted you.",
  "What's been on your mind lately?",
  "How have you taken care of yourself today?",
];

/**
 * Quick entry templates for rapid journaling
 * Your Wingman offers structured starting points
 */
const QUICK_ENTRIES = [
  { name: "Grateful", template: "Today I'm grateful for:\n• " },
  { name: "Reflect", template: "When I reflect on today, I realize:\n" },
  { name: "Goals", template: "My goals for tomorrow are:\n1. " },
  { name: "Feelings", template: "Right now I'm feeling:\n" },
];

interface DiaryEntryProps {
  initialTitle?: string;
  initialContent?: string;
  initialMood?: string;
  onSave?: (entry: { title: string; content: string; mood: string }) => void;
  isEditing?: boolean;
  isNewEntry?: boolean;
}

/**
 * DiaryEntry Component - Your Wingman's Creative Sanctuary
 * Immersive writing environment with mood-responsive theming and floating tools
 * Where thoughts transform into chronicles of victory
 */
const DiaryEntry: React.FC<DiaryEntryProps> = ({
  initialTitle = "",
  initialContent = "",
  initialMood = "neutral",
  onSave,
  isEditing = false,
  isNewEntry = false,
}) => {
  const navigate = useNavigate();
  const { addEntry } = useDiary();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mood, setMood] = useState<string>(initialMood);
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [hasSelection, setHasSelection] = useState(
    !!initialMood && initialMood !== "neutral"
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const currentDateTime = format(new Date(), "EEEE, MMMM d, yyyy · h:mm a");

  /**
   * Activates immersive writing mode on component mount
   * Your Wingman creates distraction-free environment
   */
  useEffect(() => {
    const event = new CustomEvent("toggle-sidebar", {
      detail: { visible: false },
    });
    window.dispatchEvent(event);

    document.body.classList.add("immersive-mode");
    document.body.classList.add(`mood-${mood}`);

    return () => {
      const restoreEvent = new CustomEvent("toggle-sidebar", {
        detail: { visible: true },
      });
      window.dispatchEvent(restoreEvent);
      document.body.classList.remove("immersive-mode");
      document.body.classList.remove(`mood-${mood}`);
    };
  }, [mood]);

  /**
   * Updates mood-specific styling when mood changes
   * Your Wingman adjusts ambiance to match emotional state
   */
  useEffect(() => {
    ["happy", "sad", "neutral", "excited", "tired", "relaxed"].forEach(
      (moodValue) => {
        document.body.classList.remove(`mood-${moodValue}`);
      }
    );

    document.body.classList.add(`mood-${mood}`);
  }, [mood]);

  /**
   * Initializes random writing prompts for inspiration
   * Your Wingman provides fresh creative sparks
   */
  useEffect(() => {
    const shuffled = [...WRITING_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 4));
  }, []);

  /**
   * Auto-resizes textarea as content grows
   * Your Wingman ensures comfortable writing space
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  /**
   * Handles clicking outside tools panel to close it
   * Your Wingman provides intuitive interface behavior
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showTools &&
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".diary-tools-toggle")
      ) {
        setShowTools(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTools]);

  useEffect(() => {
    if (isEditing) {
      // Special behavior for edit mode
    }

    if (isNewEntry) {
      setTitle("");
      setContent("");
    }
  }, [isEditing, isNewEntry]);

  const handleQuickEntry = (template: string) => {
    const newContent = content ? `${content}\n\n${template}` : template;
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
  };

  const handleInsertPrompt = (prompt: string) => {
    const newContent = content ? `${content}\n\n${prompt}\n` : `${prompt}\n`;
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
  };

  /**
   * Handles saving diary entry with validation
   * Your Wingman ensures all thoughts are properly preserved
   */
  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title for your diary entry, boss");
      return;
    }

    setIsSaving(true);

    try {
      const entryData = {
        title,
        content,
        mood,
        date: format(new Date(), "yyyy-MM-dd"),
      };

      console.log("Wingman: Saving diary entry:", entryData);

      if (isEditing) {
        await onSave?.(entryData);
      } else {
        const result = await addEntry(entryData);
        console.log("Wingman: Diary entry saved successfully:", result);

        navigate("/diary/view", {
          state: { message: "Entry saved successfully" },
        });
      }
    } catch (error) {
      console.error("Wingman: Error saving diary entry:", error);

      if (String(error).includes("enum mood_scale")) {
        alert(
          "Invalid mood selection. Please try again with a different mood, boss."
        );
      } else {
        alert("Failed to save diary entry. Please try again, boss.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getMoodEmoji = (moodValue: string) => {
    const moods: Record<string, string> = {
      happy: "😊",
      neutral: "😐",
      sad: "😔",
      excited: "🤩",
      anxious: "😰",
    };
    return moods[moodValue] || "😐";
  };

  const moodOptions = [
    { value: "happy", label: "Happy" },
    { value: "sad", label: "Sad" },
    { value: "neutral", label: "Neutral" },
    { value: "excited", label: "Excited" },
    { value: "anxious", label: "Anxious" },
  ];

  return (
    <div className="diary-entry-container candle-theme">
      <div className={`mood-selector ${hasSelection ? "has-selection" : ""}`}>
        <div className="mood-selector-label">choose wisely</div>
        {moodOptions.map((moodOption) => (
          <div
            key={moodOption.value}
            className={`mood-option ${
              mood === moodOption.value ? "selected" : ""
            }`}
            onClick={() => {
              setMood(moodOption.value);
              setHasSelection(true);
            }}
            data-mood={moodOption.value}
          >
            <span className="mood-emoji">{getMoodEmoji(moodOption.value)}</span>
            <span className="mood-label">{moodOption.label}</span>
          </div>
        ))}
      </div>

      <div className="diary-main">
        <div className="diary-header">
          <div className="diary-date">{currentDateTime}</div>
          <input
            type="text"
            className="diary-title"
            placeholder="What's this chapter about, boss?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="diary-content">
          <textarea
            ref={textareaRef}
            className="diary-textarea"
            placeholder="Your thoughts await, boss..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
        </div>

        <div className="diary-footer">
          <div className="diary-actions">
            <button
              className="diary-save-btn"
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
            >
              {isSaving ? "Your Wingman is saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      </div>

      <button
        className={`diary-tools-toggle ${showTools ? "open" : ""}`}
        onClick={() => setShowTools(!showTools)}
        aria-label="Toggle writing tools"
      >
        <span className="tools-toggle-icon">✍️</span>
      </button>

      <div
        ref={toolsRef}
        className={`diary-tools ${showTools ? "visible" : "hidden"}`}
      >
        <div className="diary-tools-header">
          <h3 className="diary-tools-title">Writing Arsenal</h3>
        </div>

        <div className="diary-tools-section">
          <h3>Quick Entries</h3>
          <div className="quick-entries">
            {QUICK_ENTRIES.map((entry, index) => (
              <button
                key={index}
                className="quick-entry-btn"
                onClick={() => handleQuickEntry(entry.template)}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>

        <div className="diary-tools-section">
          <h3>Writing Prompts</h3>
          <div className="writing-prompts">
            {randomPrompts.map((prompt, index) => (
              <div
                key={index}
                className="writing-prompt"
                onClick={() => handleInsertPrompt(prompt)}
              >
                <p>{prompt}</p>
              </div>
            ))}
            <button
              className="refresh-prompts-btn"
              onClick={() => {
                const shuffled = [...WRITING_PROMPTS].sort(
                  () => 0.5 - Math.random()
                );
                setRandomPrompts(shuffled.slice(0, 4));
              }}
            >
              Fresh Inspiration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiaryEntry;
