import React, { useState, useEffect } from "react";
import "./Profile.css";

// Wingman personality types that affect behavior and responses
const wingmanPersonalities = [
  {
    id: "supportive",
    name: "Supportive Buddy",
    description: "Encouraging and always positive, helps you stay motivated",
    traits: ["Motivational", "Empathetic", "Patient"],
    catchphrases: [
      "You got this!",
      "One step at a time!",
      "Believe in yourself!",
    ],
  },
  {
    id: "analytical",
    name: "Strategic Advisor",
    description: "Data-driven and logical, helps optimize your productivity",
    traits: ["Analytical", "Organized", "Efficient"],
    catchphrases: [
      "Let's analyze this",
      "Based on your data...",
      "Optimize for success",
    ],
  },
  {
    id: "creative",
    name: "Creative Spark",
    description: "Imaginative and inspiring, encourages creative thinking",
    traits: ["Creative", "Inspiring", "Innovative"],
    catchphrases: [
      "Think outside the box!",
      "What if we tried...",
      "Inspiration strikes!",
    ],
  },
  {
    id: "focused",
    name: "Focus Master",
    description: "Disciplined and goal-oriented, keeps you on track",
    traits: ["Disciplined", "Goal-oriented", "Direct"],
    catchphrases: ["Stay focused!", "Eyes on the prize", "No distractions!"],
  },
];

// Avatar appearance options
const avatarStyles = [
  {
    category: "Professional",
    options: [
      "https://api.dicebear.com/7.x/personas/svg?seed=professional1&backgroundColor=3b82f6",
      "https://api.dicebear.com/7.x/personas/svg?seed=professional2&backgroundColor=8b5cf6",
      "https://api.dicebear.com/7.x/personas/svg?seed=professional3&backgroundColor=06b6d4",
    ],
  },
  {
    category: "Friendly",
    options: [
      "https://api.dicebear.com/7.x/personas/svg?seed=friendly1&backgroundColor=10b981",
      "https://api.dicebear.com/7.x/personas/svg?seed=friendly2&backgroundColor=f59e0b",
      "https://api.dicebear.com/7.x/personas/svg?seed=friendly3&backgroundColor=ef4444",
    ],
  },
  {
    category: "Futuristic",
    options: [
      "https://api.dicebear.com/7.x/personas/svg?seed=future1&backgroundColor=6366f1",
      "https://api.dicebear.com/7.x/personas/svg?seed=future2&backgroundColor=8b5cf6",
      "https://api.dicebear.com/7.x/personas/svg?seed=future3&backgroundColor=06b6d4",
    ],
  },
];

interface WingmanConfig {
  name: string;
  personality: string;
  avatar: string;
  appearance: string;
  createdAt: string;
}

const ProfileAvatar: React.FC = () => {
  const [wingmanConfig, setWingmanConfig] = useState<WingmanConfig>({
    name: "Wingman",
    personality: "supportive",
    avatar: avatarStyles[0].options[0],
    appearance: "Professional",
    createdAt: new Date().toISOString(),
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Load existing Wingman config
  useEffect(() => {
    const savedConfig = localStorage.getItem("wingmanConfig");
    if (savedConfig) {
      setWingmanConfig(JSON.parse(savedConfig));
    }
  }, []);
  const handlePersonalitySelect = (personalityId: string) => {
    setWingmanConfig((prev) => ({
      ...prev,
      personality: personalityId,
    }));
  };

  const handleAvatarSelect = (avatar: string, category: string) => {
    setWingmanConfig((prev) => ({
      ...prev,
      avatar: avatar,
      appearance: category,
    }));
  };

  const handleNameChange = (name: string) => {
    setWingmanConfig((prev) => ({
      ...prev,
      name: name || "Wingman",
    }));
  };
  const handleSaveWingman = () => {
    try {
      // Save wingman config to localStorage
      localStorage.setItem("wingmanConfig", JSON.stringify(wingmanConfig));

      // Also save to user profile for legacy compatibility
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.wingman = wingmanConfig;
      user.avatar = wingmanConfig.avatar; // Keep for backward compatibility
      localStorage.setItem("user", JSON.stringify(user));

      // Dispatch custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("wingman-updated", {
          detail: wingmanConfig,
        })
      );

      setSaveStatus("Wingman customized successfully! 🎉");
      setIsCustomizing(false);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Error saving wingman:", error);
      setSaveStatus("Failed to save Wingman configuration");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const selectedPersonality =
    wingmanPersonalities.find((p) => p.id === wingmanConfig.personality) ||
    wingmanPersonalities[0];
  return (
    <div className="settings-container">
      <h2 className="settings-title">🤖 Design Your Wingman</h2>
      <p className="wingman-subtitle">
        Create your personal AI companion that will guide you throughout the app
      </p>

      {/* Current Wingman Preview */}
      <div className="wingman-preview">
        <div className="wingman-card">
          <div className="wingman-avatar-large">
            <img
              src={wingmanConfig.avatar}
              alt={wingmanConfig.name}
              onError={(e) => {
                e.currentTarget.src =
                  "https://api.dicebear.com/7.x/personas/svg?seed=Fallback";
              }}
            />
          </div>
          <div className="wingman-info">
            <h3 className="wingman-name">{wingmanConfig.name}</h3>
            <p className="wingman-personality-name">
              {selectedPersonality.name}
            </p>
            <p className="wingman-description">
              {selectedPersonality.description}
            </p>
            <div className="wingman-traits">
              {selectedPersonality.traits.map((trait) => (
                <span key={trait} className="trait-tag">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="wingman-example">
          <h4>💬 Sample Interaction:</h4>
          <div className="sample-message">
            <div className="wingman-bubble">
              "{selectedPersonality.catchphrases[0]}"
            </div>
          </div>
        </div>
      </div>

      {/* Customization Section */}
      <div className="settings-section">
        <div className="settings-header">
          <h3 className="settings-section-title">✏️ Customize Your Wingman</h3>
          <button
            className={`customize-toggle ${isCustomizing ? "active" : ""}`}
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            {isCustomizing ? "Done Customizing" : "Start Customizing"}
          </button>
        </div>

        {isCustomizing && (
          <div className="customization-panel">
            {/* Name Input */}
            <div className="customization-group">
              <label className="customization-label">Wingman Name</label>
              <input
                type="text"
                value={wingmanConfig.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter your Wingman's name"
                className="wingman-name-input"
                maxLength={20}
              />
            </div>

            {/* Personality Selection */}
            <div className="customization-group">
              <label className="customization-label">Personality Type</label>
              <div className="personality-grid">
                {wingmanPersonalities.map((personality) => (
                  <div
                    key={personality.id}
                    className={`personality-card ${
                      wingmanConfig.personality === personality.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handlePersonalitySelect(personality.id)}
                  >
                    <h4>{personality.name}</h4>
                    <p>{personality.description}</p>
                    <div className="personality-preview">
                      <span className="catchphrase">
                        "{personality.catchphrases[0]}"
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avatar Selection */}
            <div className="customization-group">
              <label className="customization-label">Appearance Style</label>
              {avatarStyles.map((style) => (
                <div key={style.category} className="avatar-category">
                  <h4 className="category-name">{style.category}</h4>
                  <div className="avatar-options">
                    {style.options.map((avatar, index) => (
                      <div
                        key={index}
                        className={`avatar-option ${
                          wingmanConfig.avatar === avatar ? "selected" : ""
                        }`}
                        onClick={() =>
                          handleAvatarSelect(avatar, style.category)
                        }
                      >
                        <img
                          src={avatar}
                          alt={`${style.category} option ${index + 1}`}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://api.dicebear.com/7.x/personas/svg?seed=Fallback";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button
          className="settings-btn primary"
          onClick={handleSaveWingman}
          disabled={!isCustomizing && !wingmanConfig.name}
        >
          Save Wingman Configuration
        </button>

        {saveStatus && <div className="settings-saved">{saveStatus}</div>}
      </div>


    </div>
  );
};

export default ProfileAvatar;
