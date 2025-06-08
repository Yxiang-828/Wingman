// Welcome popup that greets the boss with style and provides app orientation
import React, { useState, useEffect } from "react";
import productiveIcon from "../../assets/icons/productive.png";
import moodyIcon from "../../assets/icons/moody.png";
import "./WelcomePopup.css";

// Icon mapping for different moods - your Wingman adapts to your vibe
const moodIcons: Record<string, string> = {
  productive: productiveIcon,
  moody: moodyIcon,
};

interface WelcomePopupProps {
  message: string;
  onClose: () => void;
  icon?: string;
  type?: "registration" | "login" | "general";
  username?: string;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({
  message,
  onClose,
  icon,
  type = "general",
  username,
}) => {
  const [mood, setMood] = useState<"productive" | "moody">("productive");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for mood changes from the main process
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") setMood(mood);
      });
    }

    // Smooth entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  // Graceful exit with fade animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // Auto-dismiss for non-critical popups to respect the boss's time
  useEffect(() => {
    if (type !== "registration") {
      const timer = setTimeout(handleClose, 6000);
      return () => clearTimeout(timer);
    }
  }, [type]);

  // Context-aware button text that matches the situation
  const getButtonText = () => {
    switch (type) {
      case "registration":
        return "Let's Get Started!";
      case "login":
        return "Continue";
      default:
        return "Got it!";
    }
  };

  // Dynamic styling based on popup importance
  const getAnimationClass = () => {
    switch (type) {
      case "registration":
        return "registration-popup";
      case "login":
        return "login-popup";
      default:
        return "";
    }
  };

  return (
    <div className={`popup-overlay ${isVisible ? "visible" : ""}`}>
      <div className={`popup-card ${getAnimationClass()}`}>
        {icon ? (
          <span className="popup-icon text-5xl mb-2">{icon}</span>
        ) : (
          <img
            src={moodIcons[mood]}
            alt="Wingman Logo"
            className="logo-img mb-3"
            style={{ width: "64px", height: "64px" }}
          />
        )}

        {/* Special welcome treatment for new commanders */}
        {type === "registration" && (
          <div className="welcome-header">
            <h2 className="welcome-title">Welcome to Wingman!</h2>
            <p className="welcome-subtitle">
              {username
                ? `Hey ${username}, you're all set!`
                : "Your productivity companion is ready!"}
            </p>
          </div>
        )}

        <div className="popup-message text-xl font-bold mb-2 text-accent-primary text-center">
          {message.split("\n").map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < message.split("\n").length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>

        {/* Feature showcase for new users */}
        {type === "registration" && (
          <div className="registration-info">
            <p className="info-text">
              Your Wingman is armed with advanced productivity tools:
            </p>
            <ul className="feature-list">
              <li>Smart diary with mood tracking</li>
              <li>Intelligent calendar with time blocking</li>
              <li>AI assistant powered by Ollama</li>
              <li>
                6 beautiful themes (Dark, Light, Yandere, Kuudere, Tsundere,
                Dandere)
              </li>
              <li>Hybrid architecture: Local data with cloud auth</li>
              <li>Complete offline functionality</li>
            </ul>

            <div className="pro-tip">
              <p className="tip-text">
                <strong>Pro Tip:</strong> Press <kbd>'Ctrl' + '-'</kbd> to make the
                app smaller if it looks too big!
              </p>
            </div>
          </div>
        )}

        <button
          className="action-btn bg-accent-primary hover:bg-accent-secondary text-white font-bold py-3 px-8 rounded mt-4 transition-all"
          onClick={handleClose}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default WelcomePopup;
