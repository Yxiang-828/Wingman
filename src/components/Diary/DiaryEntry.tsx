import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import MoodSelector from '../Common/MoodSelector';
import './DiaryEntry.css';

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
  "How have you taken care of yourself today?"
];

// Quick entry templates
const QUICK_ENTRIES = [
  { name: "Grateful", template: "Today I'm grateful for:\n• " },
  { name: "Reflect", template: "When I reflect on today, I realize:\n" },
  { name: "Goals", template: "My goals for tomorrow are:\n1. " },
  { name: "Feelings", template: "Right now I'm feeling:\n" }
];

interface DiaryEntryProps {
  initialTitle?: string;
  initialContent?: string;
  initialMood?: string;
  onSave?: (entry: { title: string; content: string; mood: string }) => void;
  isEditing?: boolean;
}

const DiaryEntry: React.FC<DiaryEntryProps> = ({
  initialTitle = '',
  initialContent = '',
  initialMood = 'neutral',
  onSave,
  isEditing = false
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mood, setMood] = useState<string>(initialMood);
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTools, setShowTools] = useState(false); // Start with hidden tools sidebar
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  
  // Get current date and time formatted nicely
  const currentDateTime = format(new Date(), 'EEEE, MMMM d, yyyy · h:mm a');

  // Get random writing prompts on load
  useEffect(() => {
    // Shuffle array and take 4
    const shuffled = [...WRITING_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 4));
  }, []);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);
  
  // Close sidebar when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only hide if tools are showing and click is outside both the tools panel and toggle button
      if (showTools && 
          toolsRef.current && 
          !toolsRef.current.contains(event.target as Node) &&
          !(event.target as Element).closest('.diary-tools-toggle')) {
        setShowTools(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTools]);

  // Handle inserting a quick entry template
  const handleQuickEntry = (template: string) => {
    // If there's already content, add a line break before the template
    const newContent = content ? `${content}\n\n${template}` : template;
    setContent(newContent);
    
    // Focus textarea and move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newContent.length, newContent.length);
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
        textareaRef.current.setSelectionRange(newContent.length, newContent.length);
      }
    }, 0);
  };

  // Handle saving the entry
  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    
    try {
      if (onSave) {
        await onSave({
          title: title.trim() || format(new Date(), 'MMMM d, yyyy'),
          content: content.trim(),
          mood
        });
      }
    } catch (error) {
      console.error('Error saving diary entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="diary-entry-container">
      <div className="diary-main">
        <div className="diary-header">
          <div className="diary-date">{currentDateTime}</div>
          <input
            type="text"
            className="diary-title"
            placeholder="Entry Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        
        <div className="diary-content">
          <textarea
            ref={textareaRef}
            className="diary-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your thoughts here..."
          />
        </div>
        
        <div className="diary-footer">
          <div className="diary-mood">
            <label>How are you feeling?</label>
            <MoodSelector selectedMood={mood} onChange={setMood} />
          </div>
          
          <div className="diary-actions">
            <button 
              className="diary-save-btn" 
              onClick={handleSave} 
              disabled={isSaving || !content.trim()}
            >
              {isSaving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Toggle button with ref for click outside handling */}
      <button 
        ref={toggleBtnRef}
        className={`diary-tools-toggle ${showTools ? 'open' : ''}`} 
        onClick={() => setShowTools(!showTools)}
        aria-label="Toggle writing tools"
      >
        <span className="tools-toggle-icon">✏️</span>
      </button>
      
      {/* Sidebar with tools - ref added for click outside handling */}
      <div ref={toolsRef} className={`diary-tools ${showTools ? 'visible' : 'hidden'}`}>
        <div className="diary-tools-header">
          <h2 className="diary-tools-title">Writing Tools</h2>
        </div>
        
        <div className="diary-tools-section">
          <h3>Quick Templates</h3>
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
              <div key={index} className="writing-prompt">
                <p>{prompt}</p>
                <button 
                  className="use-prompt-btn"
                  onClick={() => handleInsertPrompt(prompt)}
                >
                  Use
                </button>
              </div>
            ))}
            <button 
              className="refresh-prompts-btn"
              onClick={() => {
                const shuffled = [...WRITING_PROMPTS].sort(() => 0.5 - Math.random());
                setRandomPrompts(shuffled.slice(0, 4));
              }}
            >
              Refresh Prompts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiaryEntry;