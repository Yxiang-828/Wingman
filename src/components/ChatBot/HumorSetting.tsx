import React from "react";
import "./ChatBot.css";

interface HumorSettingProps {
  humor: "serious" | "funny";
  setHumor: (humor: "serious" | "funny") => void;
}

const HumorSetting: React.FC<HumorSettingProps> = ({ humor, setHumor }) => {
  return (
    <div className="chatbot-humor-setting">
      <span className="humor-label">Wingman Mode:</span>
      <button
        className={`chatbot-humor-btn ${humor === "serious" ? "active" : ""}`}
        onClick={() => setHumor("serious")}
        title="Professional wingman at your service"
      >
        🎯 Mission-Focused
      </button>
      <button
        className={`chatbot-humor-btn ${humor === "funny" ? "active" : ""}`}
        onClick={() => setHumor("funny")}
        title="Fun-loving wingman ready to serve"
      >
        😄 Cheerful Sidekick
      </button>
    </div>
  );
};

export default HumorSetting;