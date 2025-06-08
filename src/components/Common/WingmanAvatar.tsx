import React, { useState, useEffect } from "react";
import "./WingmanAvatar.css";

export interface WingmanPersonality {
  name: string;
  traits: string[];
  responses: {
    encouragement: string[];
    celebration: string[];
    support: string[];
    motivation: string[];
  };
}

export interface WingmanAvatarData {
  id: string;
  name: string;
  imageUrl: string;
  personality: WingmanPersonality;
  appearance: {
    backgroundColor: string;
    borderColor: string;
    glowColor: string;
  };
}

interface WingmanAvatarProps {
  size?: "small" | "medium" | "large" | "toggle";
  mood?: "happy" | "sad" | "neutral" | "excited" | "anxious";
  showMessage?: boolean;
  message?: string;
  context?: "diary" | "dashboard" | "chat" | "profile" | "sidebar";
  onClick?: () => void;
  className?: string;
}

/**
 * Maps personality configurations to Wingman response patterns
 * Your Wingman adapts its communication style based on your preferences
 */
const getPersonalityFromConfig = (
  personalityId: string
): WingmanPersonality => {
  const personalityMap: Record<string, WingmanPersonality> = {
    supportive: {
      name: "Supportive Buddy",
      traits: ["Motivational", "Empathetic", "Patient"],
      responses: {
        encouragement: [
          "You got this, boss!",
          "One step at a time!",
          "Believe in yourself!",
        ],
        celebration: [
          "Amazing work! So proud of you!",
          "You absolutely crushed it!",
          "That's what I call success!",
        ],
        support: [
          "I'm here for you, always.",
          "It's okay to have tough days.",
          "Take your time. I'll be right here.",
        ],
        motivation: [
          "Ready to tackle today's goals, boss?",
          "Your potential is limitless!",
          "Time to show the world what you're made of!",
        ],
      },
    },
    analytical: {
      name: "Strategic Advisor",
      traits: ["Analytical", "Organized", "Efficient"],
      responses: {
        encouragement: [
          "Let's analyze this step by step, boss",
          "Based on your data, you're improving!",
          "Optimize for success!",
        ],
        celebration: [
          "Excellent performance metrics!",
          "Your efficiency is outstanding!",
          "Data shows you're crushing it!",
        ],
        support: [
          "Let's break this down logically",
          "Based on patterns, this too shall pass",
          "I'm here to help you strategize",
        ],
        motivation: [
          "Time to optimize your performance, boss!",
          "Let's achieve maximum efficiency!",
          "Data-driven success awaits!",
        ],
      },
    },
    creative: {
      name: "Creative Spark",
      traits: ["Creative", "Inspiring", "Innovative"],
      responses: {
        encouragement: [
          "Think outside the box, boss!",
          "What if we tried something new?",
          "Inspiration strikes when you least expect it!",
        ],
        celebration: [
          "Your creativity is absolutely brilliant!",
          "What an innovative approach!",
          "Pure creative genius at work!",
        ],
        support: [
          "Let's explore new possibilities",
          "Sometimes the best ideas come from challenges",
          "I'm here to spark your imagination",
        ],
        motivation: [
          "Time to unleash your creativity, boss!",
          "Let your imagination run wild!",
          "Innovation is your superpower!",
        ],
      },
    },
    focused: {
      name: "Focus Master",
      traits: ["Disciplined", "Goal-oriented", "Direct"],
      responses: {
        encouragement: [
          "Stay focused on your goals, boss!",
          "Eyes on the prize!",
          "Discipline leads to success!",
        ],
        celebration: [
          "Perfect execution! Goal achieved!",
          "Your focus paid off brilliantly!",
          "Laser-focused success!",
        ],
        support: [
          "Let's refocus and tackle this",
          "Discipline builds strength",
          "I'll help you stay on track",
        ],
        motivation: [
          "Time to focus and conquer, boss!",
          "Channel your discipline!",
          "Goal-crushing mode activated!",
        ],
      },
    },
  };

  return personalityMap[personalityId] || personalityMap.supportive;
};

/**
 * WingmanAvatar Component - Your Loyal Digital Companion
 * Displays customizable avatar with mood-based responses and personality traits
 * Adapts communication style based on context and user preferences
 */
const WingmanAvatar: React.FC<WingmanAvatarProps> = ({
  size = "medium",
  mood = "neutral",
  showMessage = false,
  message,
  context = "profile",
  onClick,
  className = "",
}) => {
  const [avatarData, setAvatarData] = useState<WingmanAvatarData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(message);

  /**
   * Loads avatar configuration from persistent storage
   * Your Wingman remembers all customization preferences
   */
  useEffect(() => {
    const loadAvatarData = () => {
      // Load from wingmanConfig (user's customized Wingman)
      const savedWingmanConfig = localStorage.getItem("wingmanConfig");
      if (savedWingmanConfig) {
        try {
          const config = JSON.parse(savedWingmanConfig);

          const avatarFromConfig: WingmanAvatarData = {
            id: "user-customized",
            name: config.name || "Wingman",
            imageUrl: config.avatar || "/src/assets/productive.png",
            personality: getPersonalityFromConfig(config.personality),
            appearance: {
              backgroundColor: "rgba(100, 108, 255, 0.1)",
              borderColor: "rgba(100, 108, 255, 0.3)",
              glowColor: "rgba(100, 108, 255, 0.4)",
            },
          };
          setAvatarData(avatarFromConfig);
          return;
        } catch (e) {
          console.error("Wingman: Failed to load configuration:", e);
        }
      }

      // Fallback to legacy wingmanAvatar format
      const savedAvatar = localStorage.getItem("wingmanAvatar");
      if (savedAvatar) {
        try {
          setAvatarData(JSON.parse(savedAvatar));
        } catch (e) {
          console.error("Wingman: Failed to load avatar data:", e);
          setDefaultAvatar();
        }
      } else {
        setDefaultAvatar();
      }
    };

    loadAvatarData();

    /**
     * Event listeners for cross-component avatar updates
     * Ensures avatar stays synchronized across your interface
     */
    const handleWingmanUpdate = () => {
      console.log("Wingman: Configuration updated, reloading avatar...");
      loadAvatarData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "wingmanConfig") {
        console.log("Wingman: Detected configuration change, reloading...");
        loadAvatarData();
      }
    };

    window.addEventListener("wingman-updated", handleWingmanUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("wingman-updated", handleWingmanUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  /**
   * Sets default avatar configuration when none exists
   * Your Wingman always has a fallback personality ready
   */
  const setDefaultAvatar = () => {
    const defaultAvatar: WingmanAvatarData = {
      id: "default",
      name: "Wingman",
      imageUrl: "/src/assets/productive.png",
      personality: {
        name: "Supportive Companion",
        traits: ["Encouraging", "Wise", "Caring", "Motivational"],
        responses: {
          encouragement: [
            "You're doing great! Keep it up!",
            "I believe in you! You've got this!",
            "Every step forward is progress!",
          ],
          celebration: [
            "Amazing work! I'm so proud of you, boss!",
            "You absolutely crushed it!",
            "That's what I call success!",
          ],
          support: [
            "I'm here for you, always.",
            "It's okay to have tough days. You're not alone.",
            "Take your time. I'll be right here.",
          ],
          motivation: [
            "Ready to tackle today's goals? Let's do this!",
            "Your potential is limitless!",
            "Time to show the world what you're made of!",
          ],
        },
      },
      appearance: {
        backgroundColor: "rgba(100, 108, 255, 0.1)",
        borderColor: "rgba(100, 108, 255, 0.3)",
        glowColor: "rgba(100, 108, 255, 0.4)",
      },
    };
    setAvatarData(defaultAvatar);
  };

  /**
   * Generates contextual messages based on mood and current interface context
   * Your Wingman provides relevant responses for different situations
   */
  useEffect(() => {
    if (!showMessage || message || !avatarData) return;

    const getContextualMessage = () => {
      const { responses } = avatarData.personality;

      switch (context) {
        case "diary":
          if (mood === "happy" || mood === "excited") {
            return responses.celebration[
              Math.floor(Math.random() * responses.celebration.length)
            ];
          } else if (mood === "sad" || mood === "anxious") {
            return responses.support[
              Math.floor(Math.random() * responses.support.length)
            ];
          } else {
            return responses.encouragement[
              Math.floor(Math.random() * responses.encouragement.length)
            ];
          }
        case "dashboard":
          return responses.motivation[
            Math.floor(Math.random() * responses.motivation.length)
          ];
        case "chat":
          return "I'm here to help! What's on your mind, boss?";
        default:
          return responses.encouragement[
            Math.floor(Math.random() * responses.encouragement.length)
          ];
      }
    };

    setCurrentMessage(getContextualMessage());
  }, [mood, context, showMessage, message, avatarData]);

  /**
   * Triggers visual animation on mood changes
   * Your Wingman shows emotional responsiveness
   */
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [mood]);

  if (!avatarData) return null;

  const sizeClasses = {
    small: "wingman-avatar--small",
    medium: "wingman-avatar--medium",
    large: "wingman-avatar--large",
    toggle: "",
  };

  const moodClasses = {
    happy: "wingman-avatar--happy",
    sad: "wingman-avatar--sad",
    neutral: "wingman-avatar--neutral",
    excited: "wingman-avatar--excited",
    anxious: "wingman-avatar--anxious",
  };

  return (
    <div
      className={`wingman-avatar ${sizeClasses[size]} ${moodClasses[mood]} ${
        isAnimating ? "wingman-avatar--animating" : ""
      } ${className}`}
      onClick={onClick}
      style={
        {
          "--avatar-bg": avatarData.appearance.backgroundColor,
          "--avatar-border": avatarData.appearance.borderColor,
          "--avatar-glow": avatarData.appearance.glowColor,
        } as React.CSSProperties
      }
    >
      <div className="wingman-avatar__container">
        <div className="wingman-avatar__image-wrapper">
          <img
            src={avatarData.imageUrl}
            alt={avatarData.name}
            className="wingman-avatar__image"
          />
          <div className="wingman-avatar__mood-indicator"></div>
        </div>

        {context === "sidebar" && (
          <div className="wingman-avatar__name">{avatarData.name}</div>
        )}
      </div>

      {showMessage && currentMessage && (
        <div className="wingman-avatar__message">
          <div className="wingman-avatar__message-bubble">{currentMessage}</div>
        </div>
      )}
    </div>
  );
};

export default WingmanAvatar;
