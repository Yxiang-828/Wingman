import React, { useState, useEffect } from "react";

const ProfileSettings: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    document.body.className = theme === "light" ? "light-theme" : "bg-dark";
  }, [theme]);
  const [background, setBackground] = useState("default");
  const [chatbot, setChatbot] = useState("gpt-4");
//   const [volume, setVolume] = useState(true);

  return (
    <div>
      <h2>Settings</h2>
      <label>
        Theme:
        <select value={theme} onChange={e => setTheme(e.target.value)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <br />
      <label>
        Background:
        <select value={background} onChange={e => setBackground(e.target.value)}>
          <option value="default">Default</option>
          <option value="mountain">Mountain</option>
          <option value="city">City</option>
        </select>
      </label>
      <br />
      <label>
        AI Chatbot:
        <select value={chatbot} onChange={e => setChatbot(e.target.value)}>
          <option value="ollama">Ollama</option>
          <option value="gpt-3.5">GPT-3.5</option>
          <option value="gpt-4">GPT-4</option>
        </select>
      </label>
      <br />
      {/* <label>
        Volume:
        <input type="checkbox" checked={volume} onChange={e => setVolume(e.target.checked)} />
      </label> */}
    </div>
  );
};

export default ProfileSettings;