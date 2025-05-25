import React, { useState, useEffect } from "react";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import "./WelcomePopup.css";

const moodIcons: Record<string, string> = {
  productive: productiveIcon,
  moody: moodyIcon,
};

interface WelcomePopupProps {
  message: string;
  onClose: () => void;
  icon?: string;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({
  message,
  onClose,
  icon,
}) => {
  const [mood, setMood] = useState<"productive" | "moody">("productive");

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") setMood(mood);
      });
    }
  }, []);

  return (
    <div className="popup-overlay">
      <div className="popup-card">
        {icon ? (
          <span className="text-5xl mb-2">{icon}</span>
        ) : (
          <img
            src={moodIcons[mood]}
            alt="Logo"
            className="logo-img mb-3"
            style={{ width: "48px", height: "48px" }}
          />
        )}
        <div className="text-xl font-bold mb-2 text-accent-primary text-center">
          {message}
        </div>
        <button
          className="action-btn bg-accent-primary hover:bg-accent-secondary text-white font-bold py-2 px-6 rounded mt-4 transition-all"
          onClick={onClose}
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default WelcomePopup;
