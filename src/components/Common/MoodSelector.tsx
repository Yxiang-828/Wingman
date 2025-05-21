import React from "react";
import "./MoodSelector.css";

interface MoodSelectorProps {
  selectedMood: string;
  onChange: (mood: string) => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onChange,
}) => {
  const moods = [
    { id: "happy", emoji: "😊", label: "Happy" },
    { id: "excited", emoji: "🤩", label: "Excited" },
    { id: "neutral", emoji: "😐", label: "Neutral" },
    { id: "tired", emoji: "😴", label: "Tired" },
    { id: "sad", emoji: "😔", label: "Sad" },
  ];

  return (
    <div className="mood-selector">
      {moods.map((mood) => (
        <div
          key={mood.id}
          className={`mood-option ${
            selectedMood === mood.id ? "selected" : ""
          }`}
          onClick={() => onChange(mood.id)}
        >
          <span className="mood-emoji">{mood.emoji}</span>
          <span className="mood-label">{mood.label}</span>
        </div>
      ))}
    </div>
  );
};

export default MoodSelector;
