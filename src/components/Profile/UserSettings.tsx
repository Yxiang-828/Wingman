// Add this component to your Profile folder

import React, { useState, useEffect } from 'react';
import './Settings.css';

// Define the settings interface
interface UserSettings {
  fontSizes: {
    diaryTitle: number;
    diaryContent: number;
    diaryMeta: number;
    diaryEntryTitle: number;
  };
  theme: 'dark' | 'light' | 'auto';
  notificationsEnabled: boolean;
}

const UserSettings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    fontSizes: {
      diaryTitle: 1.5,
      diaryContent: 1,
      diaryMeta: 0.85,
      diaryEntryTitle: 1.1,
    },
    theme: 'dark',
    notificationsEnabled: true
  });
  
  const [saved, setSaved] = useState(false);
  
  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse saved settings:", e);
      }
    }
  }, []);
  
  // Apply font size settings to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--diary-title-size', `${settings.fontSizes.diaryTitle}rem`);
    root.style.setProperty('--diary-content-size', `${settings.fontSizes.diaryContent}rem`);
    root.style.setProperty('--diary-meta-size', `${settings.fontSizes.diaryMeta}rem`);
    root.style.setProperty('--diary-entry-title-size', `${settings.fontSizes.diaryEntryTitle}rem`);
  }, [settings.fontSizes]);
  
  const handleFontSizeChange = (property: keyof typeof settings.fontSizes, value: number) => {
    setSettings(prev => ({
      ...prev,
      fontSizes: {
        ...prev.fontSizes,
        [property]: value
      }
    }));
  };
  
  const handleSaveSettings = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };
  
  const handleResetDefaults = () => {
    const defaultSettings: UserSettings = {
      fontSizes: {
        diaryTitle: 1.5,
        diaryContent: 1,
        diaryMeta: 0.85,
        diaryEntryTitle: 1.1,
      },
      theme: 'dark',
      notificationsEnabled: true
    };
    
    setSettings(defaultSettings);
    localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">User Settings</h2>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Font Sizes</h3>
        
        <div className="settings-row">
          <label>Diary Titles</label>
          <div className="settings-control">
            <input 
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={settings.fontSizes.diaryTitle}
              onChange={(e) => handleFontSizeChange('diaryTitle', parseFloat(e.target.value))}
            />
            <span className="settings-value">{settings.fontSizes.diaryTitle}rem</span>
          </div>
          <div className="settings-preview" style={{ fontSize: `${settings.fontSizes.diaryTitle}rem` }}>
            Sample Title
          </div>
        </div>
        
        <div className="settings-row">
          <label>Content Text</label>
          <div className="settings-control">
            <input 
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={settings.fontSizes.diaryContent}
              onChange={(e) => handleFontSizeChange('diaryContent', parseFloat(e.target.value))}
            />
            <span className="settings-value">{settings.fontSizes.diaryContent}rem</span>
          </div>
          <div className="settings-preview" style={{ fontSize: `${settings.fontSizes.diaryContent}rem` }}>
            This is sample content text
          </div>
        </div>
        
        <div className="settings-row">
          <label>Entry Titles</label>
          <div className="settings-control">
            <input 
              type="range"
              min="0.9"
              max="1.8"
              step="0.1"
              value={settings.fontSizes.diaryEntryTitle}
              onChange={(e) => handleFontSizeChange('diaryEntryTitle', parseFloat(e.target.value))}
            />
            <span className="settings-value">{settings.fontSizes.diaryEntryTitle}rem</span>
          </div>
          <div className="settings-preview" style={{ fontSize: `${settings.fontSizes.diaryEntryTitle}rem` }}>
            Sample Entry Title
          </div>
        </div>
        
        <div className="settings-row">
          <label>Meta Text</label>
          <div className="settings-control">
            <input 
              type="range"
              min="0.7"
              max="1.2"
              step="0.05"
              value={settings.fontSizes.diaryMeta}
              onChange={(e) => handleFontSizeChange('diaryMeta', parseFloat(e.target.value))}
            />
            <span className="settings-value">{settings.fontSizes.diaryMeta}rem</span>
          </div>
          <div className="settings-preview" style={{ fontSize: `${settings.fontSizes.diaryMeta}rem` }}>
            Date: May 21, 2025
          </div>
        </div>
      </div>
      
      <div className="settings-actions">
        <button onClick={handleResetDefaults} className="settings-btn secondary">
          Reset to Defaults
        </button>
        <button onClick={handleSaveSettings} className="settings-btn primary">
          Save Settings
        </button>
      </div>
      
      {saved && <div className="settings-saved">Settings saved successfully!</div>}
    </div>
  );
};

export default UserSettings;