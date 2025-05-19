import React from "react";
import "./ChatBot.css";

interface HumorSettingProps {
  humor: "serious" | "funny";
  setHumor: (h: "serious" | "funny") => void;
}

const HumorSetting: React.FC<HumorSettingProps> = ({ humor, setHumor }) => (
  <div className="chatbot-humor-setting mb-4">
    <label className="mr-2 text-light">Wingman style:</label>
    <button
      className={`chatbot-humor-btn ${humor === "serious" ? "active" : ""}`}
      onClick={() => setHumor("serious")}
      type="button"
    >
      🧐 Serious
    </button>
    <button
      className={`chatbot-humor-btn ${humor === "funny" ? "active" : ""}`}
      onClick={() => setHumor("funny")}
      type="button"
    >
      😄 Funny
    </button>
  </div>
);

export default HumorSetting;