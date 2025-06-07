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
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") setMood(mood);
      });
    }

    // Fade in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  // Enhanced close handler with fade out
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // Auto-close for non-registration popups
  useEffect(() => {
    if (type !== "registration") {
      const timer = setTimeout(handleClose, 6000); // Extended to 6 seconds for reading time
      return () => clearTimeout(timer);
    }
  }, [type]);

  // Get appropriate button text based on type
  const getButtonText = () => {
    switch (type) {
      case "registration":
        return "Let's Get Started! 🚀";
      case "login":
        return "Continue";
      default:
        return "Got it!";
    }
  };

  // Get appropriate animation class
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

        {/* Enhanced welcome header for registration */}
        {type === "registration" && (
          <div className="welcome-header">
            <h2 className="welcome-title">Welcome to Wingman!</h2>
            <p className="welcome-subtitle">
              {username
                ? `Hey ${username}, you're all set! 👋`
                : "Your productivity companion is ready! 🎉"}
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

        {/* Enhanced info for registration with app introduction */}
        {type === "registration" && (
          <div className="registration-info">
            <p className="info-text">
              🚁 Wingman is your advanced productivity companion:
            </p>
            <ul className="feature-list">
              <li>📝 Smart diary with mood tracking</li>
              <li>📅 Intelligent calendar with time blocking</li>
              <li>🤖 AI assistant powered by Ollama</li>
              <li>🎨 6 beautiful themes (Dark, Light, Yandere, Kuudere, Tsundere, Dandere)</li>
              <li>🔐 Hybrid architecture: Local data + Cloud auth</li>
              <li>📱 Complete offline functionality</li>
            </ul>

            <div className="pro-tip">
              <p className="tip-text">
                💡{" "}
                <strong>Pro Tip:</strong> Press <kbd>Ctrl + -</kbd> to make the app
                smaller if it looks too big!
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
