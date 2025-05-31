import React, { useState, useEffect } from "react";
import { getCurrentUser, setCurrentUser } from "../../utils/auth"; // Adjust path if needed
import { useTheme } from "../../context/ThemeContext";
import { useBackground } from "../../context/BackgroundContext";

const ProfileSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { background, setBackground } = useBackground();
  const [user, setUser] = useState({
    username: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [chatbot, setChatbot] = useState("gpt-4"); // Default chatbot
  //   const [volume, setVolume] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Set user info for display
      setUser({
        username: currentUser.username || "",
        email: currentUser.email || "",
      });
      // Load settings if they exist
      if (currentUser.settings) {
        setBackground(currentUser.settings.background || "default");
        setChatbot(currentUser.settings.chatbot || "gpt-4");
      }
    }
  }, []);
  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage("");
    const currentUser = getCurrentUser();

    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        settings: {
          theme,
          background,
          chatbot,
        },
      };
      setCurrentUser(updatedUser); // Save updated user object to localStorage

      // Also save theme settings to userSettings for ThemeContext
      const savedSettings = localStorage.getItem("userSettings");
      let settings = {};

      if (savedSettings) {
        try {
          settings = JSON.parse(savedSettings);
        } catch (e) {
          console.error("Failed to parse saved settings:", e);
        }
      }

      const updatedSettings = {
        ...settings,
        theme,
        background,
        chatbot,
      };

      localStorage.setItem("userSettings", JSON.stringify(updatedSettings));

      setSaving(false);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000); // Clear message after 3 seconds
    } else {
      setSaving(false);
      setMessage("Error: User not found. Please log in again.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div>
      <h2>Profile</h2> {/* Added Profile heading */}
      <div
        style={{
          background: "rgba(30, 30, 50, 0.5)",
          borderRadius: "10px",
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          maxWidth: "400px",
        }}
      >
        {" "}
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ color: "#9979F0", fontWeight: 600 }}>Username:</span>
          <span style={{ marginLeft: "0.5rem", color: "#9979F0" }}>
            {user.username}
          </span>
        </div>
        <div>
          <span style={{ color: "#9979F0", fontWeight: 600 }}>Email:</span>
          <span style={{ marginLeft: "0.5rem", color: "#9979F0" }}>
            {user.email}
          </span>
        </div>
      </div>
      <h2>Settings</h2>
      {message && (
        <p
          style={{
            color: saving
              ? "blue"
              : message.startsWith("Error")
              ? "red"
              : "green",
          }}
        >
          {message}
        </p>
      )}
      <label>
        Theme:
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as "dark" | "light")}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <br />{" "}
      <label>
        Background:
        <select
          value={background}
          onChange={(e) => setBackground(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="mountain">Mountain</option>
          <option value="city">City</option>
          <option value="space">Space</option>
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
      <button
        onClick={handleSaveSettings}
        disabled={saving}
        style={{ marginTop: "1rem" }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
};

export default ProfileSettings;
