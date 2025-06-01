import React from "react";
import "./ChatBot.css";

interface HumorSettingProps {
  humor: "serious" | "funny";
  setHumor: (humor: "serious" | "funny") => void;
}

/**
 * HumorSetting Component - Your Wingman's Personality Controller
 * Switch between battle-ready focus and cheerful companionship
 * Because even the most loyal Wingman needs mood adjustments
 */
const HumorSetting: React.FC<HumorSettingProps> = ({ humor, setHumor }) => {
  return (
    <div className="chatbot-humor-setting">
      <span className="humor-label">Wingman Mode:</span>
      <button
        className={`chatbot-humor-btn ${humor === "serious" ? "active" : ""}`}
        onClick={() => setHumor("serious")}
        title="Professional assistant mode - Your Wingman gets down to business"
        aria-label="Set Wingman to serious mode"
        aria-pressed={humor === "serious"}
      >
        🎯 Mission-Focused
      </button>
      <button
        className={`chatbot-humor-btn ${humor === "funny" ? "active" : ""}`}
        onClick={() => setHumor("funny")}
        title="Fun-loving assistant mode - Your Wingman brings the laughs"
        aria-label="Set Wingman to funny mode"
        aria-pressed={humor === "funny"}
      >
        😄 Cheerful Sidekick
      </button>
    </div>
  );
};

export default HumorSetting;
