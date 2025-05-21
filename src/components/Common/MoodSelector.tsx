import React from "react";
import "./MoodSelector.css";
import type { MoodScale } from "../../types/database";

interface MoodSelectorProps {
  selectedMood: MoodScale;
  onChange: (mood: MoodScale) => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onChange,
}) => {
  const moods: Array<{ value: MoodScale; emoji: string; label: string }> = [
    { value: "happy", emoji: "😊", label: "Happy" },
    { value: "excited", emoji: "🤩", label: "Excited" },
    { value: "neutral", emoji: "😐", label: "Neutral" },
    { value: "tired", emoji: "😴", label: "Tired" },
    { value: "sad", emoji: "😔", label: "Sad" },
  ];

  return (
    <div className="mood-selector">
      <div className="mood-emoji-container">
        {moods.map((mood) => (
          <div
            key={mood.value}
            className={`mood-emoji-item ${
              selectedMood === mood.value ? "selected" : ""
            }`}
            onClick={() => onChange(mood.value)}
          >
            <div className="mood-emoji">{mood.emoji}</div>
            <div className="mood-label">{mood.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoodSelector;
