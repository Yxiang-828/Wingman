import React, { useState } from "react";
import "./Profile.css";

const avatarOptions = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  // Default fallback avatars that should work even if files don't exist
  "https://api.dicebear.com/7.x/personas/svg?seed=John",
  "https://api.dicebear.com/7.x/personas/svg?seed=Emma",
  "https://api.dicebear.com/7.x/personas/svg?seed=Alex",
  "https://api.dicebear.com/7.x/personas/svg?seed=Sophia",
];

const ProfileAvatar: React.FC = () => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(avatarOptions[0]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
  };

  const handleSaveAvatar = () => {
    // Save the selected avatar (would connect to an API in a real app)
    // For now, just update local storage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.avatar = selectedAvatar;
      localStorage.setItem('user', JSON.stringify(user));
      
      setSaveStatus("Avatar saved successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Error saving avatar:", error);
      setSaveStatus("Failed to save avatar");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Avatar Settings</h2>
      
      <div className="settings-section">
        <div className="settings-header">
          <h3 className="settings-section-title">Selected Avatar</h3>
        </div>
        
        <div className="avatar-preview">
          <img 
            src={selectedAvatar} 
            alt="Current avatar" 
            className="current-avatar"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = "https://api.dicebear.com/7.x/personas/svg?seed=Fallback";
            }}
          />
        </div>
      </div>
      
      <div className="settings-section">
        <div className="settings-header">
          <h3 className="settings-section-title">Choose Avatar</h3>
        </div>
        
        <div className="avatar-options">
          {avatarOptions.map((avatar, index) => (
            <div 
              key={index} 
              className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
              onClick={() => handleAvatarSelect(avatar)}
            >
              <img 
                src={avatar} 
                alt={`Avatar option ${index + 1}`} 
                onError={(e) => {
                  e.currentTarget.src = "https://api.dicebear.com/7.x/personas/svg?seed=Fallback";
                }}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="settings-actions">
        <button className="settings-btn primary" onClick={handleSaveAvatar}>
          Save Avatar
        </button>
        
        {saveStatus && <div className="settings-saved">{saveStatus}</div>}
      </div>
    </div>
  );
};

export default ProfileAvatar;