import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import "./DiaryEntry.css";


// Writing prompts to inspire journaling
const WRITING_PROMPTS = [
  "What made you smile today?",
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

// Quick entry templates
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
  isNewEntry?: boolean; // Added to differentiate between edit and new entry
}

const DiaryEntry: React.FC<DiaryEntryProps> = ({
  initialTitle = "",
  initialContent = "",
  initialMood = "neutral",
  onSave,
  isEditing = false,
  isNewEntry = false, // Default is not a new entry
}) => {
  const navigate = useNavigate();
  const { addEntry } = useDiary();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mood, setMood] = useState<string>(initialMood);
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTools, setShowTools] = useState(false);

  // Add this state to track selection
  const [hasSelection, setHasSelection] = useState(!!initialMood && initialMood !== "neutral");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Get current date and time formatted nicely
  const currentDateTime = format(new Date(), "EEEE, MMMM d, yyyy · h:mm a");

  // Hide sidebar when component mounts (immersive mode)
  useEffect(() => {
    // Dispatch custom event to hide sidebar
    const event = new CustomEvent("toggle-sidebar", {
      detail: { visible: false },
    });
    window.dispatchEvent(event);

    // Add immersive-mode class to body
    document.body.classList.add("immersive-mode");
    document.body.classList.add(`mood-${mood}`);

    return () => {
      // Restore sidebar when component unmounts
      const restoreEvent = new CustomEvent("toggle-sidebar", {
        detail: { visible: true },
      });
      window.dispatchEvent(restoreEvent);
      // Remove immersive-mode class
      document.body.classList.remove("immersive-mode");
      document.body.classList.remove(`mood-${mood}`);
    };
  }, [mood]);

  // Update mood class when mood changes
  useEffect(() => {
    // First remove all mood classes
    ["happy", "sad", "neutral", "excited", "tired", "relaxed"].forEach(
      (moodValue) => {
        document.body.classList.remove(`mood-${moodValue}`);
      }
    );

    // Then add the current mood class
    document.body.classList.add(`mood-${mood}`);

    // Apply mood-specific styles immediately
    updateMoodStyles(mood);
  }, [mood]);

  // Get random writing prompts on load
  useEffect(() => {
    // Shuffle array and take 4
    const shuffled = [...WRITING_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 4));
  }, []);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Close sidebar when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only hide if tools are showing and click is outside both the tools panel and toggle button
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

  // Use the props in the component to conditionally render different UI
  useEffect(() => {
    // Do something based on isEditing or isNewEntry
    if (isEditing) {
      // Special behavior for edit mode
    }

    if (isNewEntry) {
      // Special behavior for new entries
      setTitle("");
      setContent("");
    }
  }, [isEditing, isNewEntry]);

  // Handle inserting a quick entry template
  const handleQuickEntry = (template: string) => {
    // If there's already content, add a line break before the template
    const newContent = content ? `${content}\n\n${template}` : template;
    setContent(newContent);

    // Focus textarea and move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
  };

  // Handle inserting a prompt
  const handleInsertPrompt = (prompt: string) => {
    const newContent = content ? `${content}\n\n${prompt}\n` : `${prompt}\n`;
    setContent(newContent);

    // Focus textarea and move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
  };

  // Handle saving the entry
  const handleSave = async () => {
    if (!title.trim()) {
      // Show validation error
      alert("Please enter a title for your diary entry");
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

      console.log("Saving diary entry:", entryData);

      if (isEditing) {
        // For editing existing entries
        await onSave?.(entryData);
      } else {
        // For new entries
        const result = await addEntry(entryData);
        console.log("Diary entry saved:", result);

        // Clear form or navigate back
        navigate("/diary/view", {
          state: { message: "Entry saved successfully" },
        });
      }
    } catch (error) {
      console.error("Error saving diary entry:", error);
      // Show a more user-friendly error
      if (String(error).includes("enum mood_scale")) {
        alert(
          "Invalid mood selection. Please try again with a different mood."
        );
      } else {
        alert("Failed to save diary entry. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Update the getMoodEmoji function first
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

  // Apply mood-specific styles
  const updateMoodStyles = (moodValue: string) => {
    const root = document.documentElement;

    // Set CSS variables based on mood
    switch (moodValue) {
      case "happy":
        root.style.setProperty("--mood-glow-color", "rgba(255, 220, 100, 0.2)");
        root.style.setProperty(
          "--mood-inner-glow",
          "rgba(255, 200, 100, 0.15)"
        );
        break;
      case "sad":
        root.style.setProperty(
          "--mood-glow-color",
          "rgba(100, 150, 255, 0.18)"
        );
        root.style.setProperty("--mood-inner-glow", "rgba(80, 130, 255, 0.15)");
        break;
      case "neutral":
        root.style.setProperty(
          "--mood-glow-color",
          "rgba(200, 200, 255, 0.15)"
        );
        root.style.setProperty(
          "--mood-inner-glow",
          "rgba(180, 180, 255, 0.12)"
        );
        break;
      case "excited":
        root.style.setProperty(
          "--mood-glow-color",
          "rgba(255, 100, 100, 0.18)"
        );
        root.style.setProperty("--mood-inner-glow", "rgba(255, 80, 80, 0.15)");
        break;
      case "tired":
        root.style.setProperty(
          "--mood-glow-color",
          "rgba(100, 180, 180, 0.16)"
        );
        root.style.setProperty("--mood-inner-glow", "rgba(80, 160, 160, 0.13)");
        break;
      case "relaxed":
        root.style.setProperty(
          "--mood-glow-color",
          "rgba(150, 255, 180, 0.17)"
        );
        root.style.setProperty(
          "--mood-inner-glow",
          "rgba(130, 235, 160, 0.14)"
        );
        break;
      default:
        root.style.setProperty("--mood-glow-color", "rgba(255, 180, 50, 0.15)");
        root.style.setProperty("--mood-inner-glow", "rgba(255, 140, 50, 0.1)");
    }
  };

  // Mood options for the selector
  const moodOptions = [
    { value: "happy", label: "Happy" },
    { value: "sad", label: "Sad" },
    { value: "neutral", label: "Neutral" },
    { value: "excited", label: "Excited" },
    { value: "anxious", label: "Anxious" },
  ];

  return (
    <div className="diary-entry-container candle-theme">
      {/* Vertical mood selector on the left */}
      <div className={`mood-selector ${hasSelection ? 'has-selection' : ''}`}>
        <div className="mood-selector-label">pick carefully</div>
        {moodOptions.map((moodOption) => (
          <div
            key={moodOption.value}
            className={`mood-option ${mood === moodOption.value ? "selected" : ""}`}
            onClick={() => {
              setMood(moodOption.value);
              setHasSelection(true);
              if (typeof updateMoodStyles === 'function') {
                updateMoodStyles(moodOption.value);
              }
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
            placeholder="Add a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="diary-content">
          <textarea
            ref={textareaRef}
            className="diary-textarea"
            placeholder="What's on your mind today?"
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
              {isSaving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle button with text for horizontal layout */}
      <button
        ref={toggleBtnRef}
        className={`diary-tools-toggle ${showTools ? "open" : ""}`}
        onClick={() => setShowTools(!showTools)}
        aria-label="Toggle writing tools"
      >
        <span className="tools-toggle-icon">✍️</span>
      </button>

      {/* Tools panel */}
      <div
        ref={toolsRef}
        className={`diary-tools ${showTools ? "visible" : "hidden"}`}
      >
        <div className="diary-tools-header">
          <h3 className="diary-tools-title">Writing Tools</h3>
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
              Refresh Prompts
            </button>
          </div>
        </div>
      </div>

      {/* Floating icons */}
      <div className="diary-floating-icons">
        <img
          src="/assets/pen-icon.png"
          className="floating-icon icon-1"
          alt=""
        />
        <img
          src="/assets/book-icon.png"
          className="floating-icon icon-2"
          alt=""
        />
        <img
          src="/assets/thought-icon.png"
          className="floating-icon icon-3"
          alt=""
        />
        <img
          src="/assets/heart-icon.png"
          className="floating-icon icon-4"
          alt=""
        />
        <img
          src="/assets/moon-icon.png"
          className="floating-icon icon-5"
          alt=""
        />
      </div>

      {/* Candle glow effect */}
      <div className="candle-glow"></div>
    </div>
  );
};

export default DiaryEntry;
