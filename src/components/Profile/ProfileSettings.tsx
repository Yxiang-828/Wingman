import React, { useState, useEffect } from "react";
import { getCurrentUser } from "../../utils/auth"; // Adjust path if needed

const ProfileSettings: React.FC = () => {
  const [user, setUser] = useState({
    username: "",
    email: "",
    displayName: "",
  });
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    document.body.className = theme === "light" ? "light-theme" : "bg-dark";
  }, [theme]);
  const [background, setBackground] = useState("default");
  const [chatbot, setChatbot] = useState("gpt-4");
  //   const [volume, setVolume] = useState(true);
  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setUser(u);
      setDisplayName(u.displayName || "");
    }
  }, []);

  return (
    <div>
      <h2>Settings</h2>
      <div
        style={{
          background: "rgba(30, 30, 50, 0.5)",
          borderRadius: "10px",
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          maxWidth: "400px",
        }}
      >
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ color: "#8a2be2", fontWeight: 600 }}>Username:</span>
          <span style={{ marginLeft: "0.5rem", color: "#fff" }}>
            {user.username}
          </span>
        </div>
        <div>
          <span style={{ color: "#8a2be2", fontWeight: 600 }}>Email:</span>
          <span style={{ marginLeft: "0.5rem", color: "#fff" }}>
            {user.email}
          </span>
        </div>
      </div>
      <label>
        {/* Display Name:
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        /> */}
      </label>
      <label>
        Theme:
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <br />
      <label>
        Background:
        <select
          value={background}
          onChange={(e) => setBackground(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="mountain">Mountain</option>
          <option value="city">City</option>
        </select>
      </label>
      <br />
      <label>
        AI Chatbot:
        <select value={chatbot} onChange={(e) => setChatbot(e.target.value)}>
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
