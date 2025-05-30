import React, { useState, useEffect } from "react";
import { getCurrentUser, setCurrentUser } from "../../utils/auth"; // Adjust path if needed
import { useTheme } from "../../context/ThemeContext";

const ProfileSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState({
    username: "",
    email: "",
    displayName: "",
    // Add settings to user state type if you want to type it more strictly
  });
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [background, setBackground] = useState("default"); // Default background
  const [chatbot, setChatbot] = useState("gpt-4"); // Default chatbot
  //   const [volume, setVolume] = useState(true);
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Ensure user state includes displayName if it exists
      setUser({
        username: currentUser.username || "",
        email: currentUser.email || "",
        displayName: currentUser.displayName || "",
        // ... any other properties from currentUser you want in the local user state
      });
      setDisplayName(currentUser.displayName || "");
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
        displayName: displayName, // Add displayName to the updated user object
        settings: {
          theme,
          background,
          chatbot,
        },
      };
      setCurrentUser(updatedUser); // Save updated user object to localStorage
      setUser(updatedUser); // Update local user state

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
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ color: "#8a2be2", fontWeight: 600 }}>Username:</span>
          <span style={{ marginLeft: "0.5rem", color: "#fff" }}>
            {user.username}
          </span>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ color: "#8a2be2", fontWeight: 600 }}>
            Display Name:
          </span>
          <span style={{ marginLeft: "0.5rem", color: "#fff" }}>
            {user.displayName || "Not set"} {/* Display the displayName here */}
          </span>
        </div>
        <div>
          <span style={{ color: "#8a2be2", fontWeight: 600 }}>Email:</span>
          <span style={{ marginLeft: "0.5rem", color: "#fff" }}>
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
        Display Name:
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{
            // Added styling for the input field
            backgroundColor: "#2c2c40",
            color: "#fff",
            border: "1px solid #8a2be2",
            borderRadius: "4px",
            padding: "0.3rem 0.5rem",
            marginLeft: "0.5rem",
            outline: "none",
          }}
        />
      </label>
      <br /> {/* Added a line break for better spacing */}{" "}
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
