import React, { useState, useEffect } from "react";
import { getCurrentUserId } from "../utils/auth";
import productiveIcon from "../assets/icons/productive.ico";
import moodyIcon from "../assets/icons/moody.ico";
import "../main.css";
import "./Avatar.css";

interface AvatarOption {
  id: string;
  name: string;
  path: string;
  isDefault: boolean;
  description?: string;
}

const Avatar: React.FC = () => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [customAvatars, setCustomAvatars] = useState<AvatarOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Default Wingman avatars that change automatically based on mood
  const defaultAvatars: AvatarOption[] = [
    {
      id: "wingman-auto",
      name: "Wingman Auto",
      path: productiveIcon,
      isDefault: true,
      description: "Adaptive avatar that changes between productive and moody states automatically"
    }
  ];

  // All available avatars including defaults and custom ones
  const allAvatars = [...defaultAvatars, ...customAvatars];

  useEffect(() => {
    loadSavedAvatar();
    loadCustomAvatars();
  }, []);

  const loadSavedAvatar = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const settings = await window.electronAPI.db.getUserSettings(userId);
      if (settings?.selectedAvatar) {
        setSelectedAvatar(settings.selectedAvatar);
      } else {
        // Default to the adaptive Wingman avatar
        setSelectedAvatar("wingman-auto");
      }
    } catch (error) {
      console.error("Failed to load saved avatar:", error);
      setSelectedAvatar("wingman-auto");
    }
  };

  const loadCustomAvatars = async () => {
    // In the future, this will load user-uploaded custom avatars
    // For now, we'll just initialize an empty array
    setCustomAvatars([]);
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return;

    setSaving(true);
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      const currentSettings = await window.electronAPI.db.getUserSettings(userId);
      const updatedSettings = {
        ...currentSettings,
        selectedAvatar: selectedAvatar
      };

      await window.electronAPI.db.saveUserSettings(userId, updatedSettings);

      // Broadcast avatar update event
      const event = new CustomEvent("avatar-updated", {
        detail: { avatarId: selectedAvatar }
      });
      window.dispatchEvent(event);

      console.log("Avatar saved successfully:", selectedAvatar);
    } catch (error) {
      console.error("Failed to save avatar:", error);
      alert("Failed to save avatar. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getAvatarPreviewPath = (avatar: AvatarOption, mood: "productive" | "moody" = "productive") => {
    if (avatar.isDefault && avatar.id === "wingman-auto") {
      return mood === "productive" ? productiveIcon : moodyIcon;
    }
    return avatar.path;
  };

  return (
    <div className="avatar-page-container">
      <div className="avatar-header">
        <h1 className="avatar-title">Choose Your Wingman Avatar</h1>
        <p className="avatar-subtitle">
          Select how your digital companion appears throughout the application
        </p>
      </div>

      <div className="avatar-preview-section">
        <h2>Preview</h2>
        {selectedAvatar && (
          <div className="avatar-preview-container">
            <div className="avatar-preview-states">
              <div className="avatar-state">
                <img
                  src={getAvatarPreviewPath(
                    allAvatars.find(a => a.id === selectedAvatar)!,
                    "productive"
                  )}
                  alt="Productive state"
                  className="avatar-preview-image"
                />
                <span className="avatar-state-label">Productive Mode</span>
              </div>
              <div className="avatar-state">
                <img
                  src={getAvatarPreviewPath(
                    allAvatars.find(a => a.id === selectedAvatar)!,
                    "moody"
                  )}
                  alt="Moody state"
                  className="avatar-preview-image"
                />
                <span className="avatar-state-label">Moody Mode</span>
              </div>
            </div>
            <div className="avatar-description">
              <p>{allAvatars.find(a => a.id === selectedAvatar)?.description}</p>
            </div>
          </div>
        )}
      </div>

      <div className="avatar-selection-section">
        <h2>Available Avatars</h2>
        
        <div className="avatar-category">
          <h3>Default Wingman Avatars</h3>
          <div className="avatar-grid">
            {defaultAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`avatar-option ${
                  selectedAvatar === avatar.id ? "selected" : ""
                }`}
                onClick={() => handleAvatarSelect(avatar.id)}
              >
                <div className="avatar-option-image">
                  <img
                    src={getAvatarPreviewPath(avatar, "productive")}
                    alt={avatar.name}
                  />
                  <div className="avatar-option-overlay">
                    <span className="avatar-option-name">{avatar.name}</span>
                  </div>
                </div>
                {avatar.isDefault && (
                  <div className="default-badge">Default</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {customAvatars.length > 0 && (
          <div className="avatar-category">
            <h3>Custom Avatars</h3>
            <div className="avatar-grid">
              {customAvatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className={`avatar-option ${
                    selectedAvatar === avatar.id ? "selected" : ""
                  }`}
                  onClick={() => handleAvatarSelect(avatar.id)}
                >
                  <div className="avatar-option-image">
                    <img src={avatar.path} alt={avatar.name} />
                    <div className="avatar-option-overlay">
                      <span className="avatar-option-name">{avatar.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="avatar-upload-section">
          <h3>Add Custom Avatar</h3>
          <div className="upload-placeholder">
            <p>Custom avatar upload will be available in a future update</p>
            <p>For now, you can use the default adaptive Wingman avatar</p>
          </div>
        </div>
      </div>

      <div className="avatar-actions">
        <button
          className="avatar-save-btn"
          onClick={handleSaveAvatar}
          disabled={!selectedAvatar || saving}
        >
          {saving ? "Saving..." : "Save Avatar"}
        </button>
      </div>
    </div>
  );
};

export default Avatar;