// Welcome popup that greets the boss with style and provides app orientation
import React, { useState, useEffect } from "react";
import productiveIcon from "../../assets/icons/productive.png";
import moodyIcon from "../../assets/icons/moody.png";
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
    // Listen for mood changes from the main process
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") setMood(mood);
      });
    }
    setTimeout(() => setIsVisible(true), 50); // Reduced from 100ms
  }, []);
  // Graceful exit with optimized fade animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };
  // Auto-dismiss for non-critical popups with reduced timer
  useEffect(() => {
    if (type !== "registration") {
      const timer = setTimeout(handleClose, 5000);
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

        {/* Step-by-step setup guide for new users */}
        {type === "registration" && (
          <div className="registration-info">
            <p className="info-text">
              🚀 Let's get your Wingman fully configured! Follow these steps:
            </p>
            <ol className="setup-steps">
              <li className="setup-step">
                <span className="step-number">1</span>
                <div className="step-content">
                  <strong>Download AI Model</strong>
                  <p>
                    Download Ollama and install <strong>Mistral AI</strong> for
                    your chat assistant
                  </p>
                  <div className="step-actions">
                    <span className="file-path">
                      Visit: ollama.ai → Install → Run:{" "}
                      <code>ollama pull mistral</code>
                    </span>
                  </div>
                </div>
              </li>
              <li className="setup-step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <strong>Choose Your Theme</strong>
                  <p>
                    Go to Profile → Settings and select from 6 beautiful themes
                  </p>
                  <div className="step-hint">
                    💡 Try Yandere, Kuudere, Tsundere, or Dandere for unique
                    personalities!
                  </div>
                </div>
              </li>
              <li className="setup-step">
                <span className="step-number">3</span>
                <div className="step-content">
                  <strong>Configure AI Chat</strong>
                  <p>
                    In Settings → Model Manager, select Mistral as your chat
                    model
                  </p>
                  <div className="step-hint">
                    🤖 This enables your intelligent assistant!
                  </div>
                </div>
              </li>
              <li className="setup-step">
                <span className="step-number">4</span>
                <div className="step-content">
                  <strong>Start Exploring</strong>
                  <p>Try the diary, calendar, tasks, and chat features</p>
                  <div className="step-hint">
                    ⭐ Everything works offline with cloud sync!
                  </div>
                </div>
              </li>
            </ol>

            <div className="pro-tip">
              <p className="tip-text">
                <strong>Pro Tip:</strong> Press <kbd>Ctrl + -</kbd> to make the
                app smaller if needed!
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
