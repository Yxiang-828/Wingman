import React, { useState, useEffect } from "react";
import { getCurrentUser, getCurrentUserId } from "../../utils/auth";
import { useTheme } from "../../context/ThemeContext";
import { useBackground } from "../../context/BackgroundContext";
import { llmService } from "../../services/llmService";
import "./Settings.css"; // ✅ USING THE CSS!
import ModelManager from './ModelManager';

interface AvailableModels {
  models: Record<string, any>;
  system_info: {
    total_ram_gb: number;
    recommended_model: string;
    can_run_3b: boolean;
    can_run_1b: boolean;
  };
}

const ProfileSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { background, setBackground } = useBackground();
  const [user, setUser] = useState({
    username: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [aiModel, setAiModel] = useState("llama3.2:1b");
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser({
        username: currentUser.username || "",
        email: currentUser.email || "",
      });
    }
    
    loadUserSettings();
    loadAIStatus();
  }, []);

  const loadUserSettings = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const settings = await window.electronAPI.db.getUserSettings(userId);
      
      if (settings) {
        setAiModel(settings.ai_model || 'llama3.2:1b');
        setTheme(settings.theme || 'dark');
        setBackground(settings.background || 'default');
      }
    } catch (error) {
      console.error("Failed to load user settings:", error);
    }
  };

  const loadAIStatus = async () => {
    try {
      setLoadingModels(true);
      
      const status = await llmService.getStatus();
      setAiStatus(status.available ? 'online' : 'offline');
      
      const modelsData = await llmService.getModels();
      setAvailableModels(modelsData);
      
    } catch (error) {
      console.error("Failed to load AI status:", error);
      setAiStatus('offline');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const settings = {
        aiModel,
        theme,
        background
      };

      const result = await window.electronAPI.db.saveUserSettings(userId, settings);
      
      if (result.success) {
        setMessage("Settings saved successfully!");
        localStorage.setItem("userSettings", JSON.stringify(settings));
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Save settings error:", error);
      setMessage("Error: Failed to save settings");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const getModelDisplayName = (modelName: string) => {
    const modelMap: Record<string, string> = {
      // Llama models
      "llama3.2:1b": "Llama 3.2 1B (Fast & Light)",
      "llama3.2:3b": "Llama 3.2 3B (Balanced)",
      "llama3.2:8b": "Llama 3.2 8B (Advanced)",
      // ✅ NEW: DeepSeek models
      "deepseek-r1:1.5b": "DeepSeek R1 1.5B (Ultra Fast)",
      "deepseek-r1:7b": "DeepSeek R1 7B (Reasoning Pro)",
      "deepseek-r1:14b": "DeepSeek R1 14B (Logic Master)",
      "deepseek-r1:32b": "DeepSeek R1 32B (Research Elite)",
    };
    return modelMap[modelName] || modelName;
  };

  const getModelDescription = (modelName: string) => {
    const descriptions: Record<string, string> = {
      // Llama models
      "llama3.2:1b": "Fastest responses, lower resource usage. Great for quick tasks and systems with limited RAM.",
      "llama3.2:3b": "Balanced performance and intelligence. Recommended for most users with 8GB+ RAM.",
      "llama3.2:8b": "Most intelligent responses, requires more resources. Best for complex tasks with 16GB+ RAM.",
      // ✅ NEW: DeepSeek descriptions
      "deepseek-r1:1.5b": "Lightning-fast reasoning model. Excellent for coding, math, and quick problem-solving.",
      "deepseek-r1:7b": "Advanced reasoning capabilities. Superior logic and analytical thinking for complex tasks.",
      "deepseek-r1:14b": "Master-level reasoning model. Exceptional at complex problem-solving and research tasks.",
      "deepseek-r1:32b": "Elite reasoning model for advanced research, complex analysis, and sophisticated problem-solving.",
    };
    return descriptions[modelName] || "Advanced AI model for intelligent assistance.";
  };

  const canRunModel = (modelName: string) => {
    if (!availableModels?.system_info) return true;
    
    const systemInfo = availableModels.system_info;
    const ramGb = systemInfo.total_ram_gb;
    
    // ✅ UPDATED: RAM requirements for all models
    switch (modelName) {
      case "llama3.2:1b":
      case "deepseek-r1:1.5b":
        return ramGb >= 2;
      case "llama3.2:3b":
        return ramGb >= 4;
      case "deepseek-r1:7b":
        return ramGb >= 6;
      case "llama3.2:8b":
        return ramGb >= 8;
      case "deepseek-r1:14b":
        return ramGb >= 12;
      case "deepseek-r1:32b":
        return ramGb >= 20;
      default:
        return false;
    }
  };

  const getStatusColor = () => {
    switch (aiStatus) {
      case 'online': return '#4ade80';
      case 'offline': return '#ef4444';
      case 'checking': return '#fbbf24';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (aiStatus) {
      case 'online': return 'AI Ready';
      case 'offline': return 'AI Offline';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  // ✅ GROUP MODELS by provider
  const getModelsByProvider = () => {
    const allModels = ["llama3.2:1b", "llama3.2:3b", "llama3.2:8b", "deepseek-r1:1.5b", "deepseek-r1:7b", "deepseek-r1:14b", "deepseek-r1:32b"];
    
    return {
      llama: allModels.filter(model => model.startsWith("llama")),
      deepseek: allModels.filter(model => model.startsWith("deepseek"))
    };
  };

  const modelGroups = getModelsByProvider();

  return (
    <div className="profile-settings-container">
      <h2 className="settings-main-title">Profile Settings</h2>
      
      {/* User Info Section */}
      <div className="settings-card">
        <h3 className="settings-card-title">Account Information</h3>
        <div className="user-info-grid">
          <div className="user-info-item">
            <span className="user-info-label">Username:</span>
            <span className="user-info-value">{user.username}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Email:</span>
            <span className="user-info-value">{user.email}</span>
          </div>
        </div>
      </div>

      {/* AI Settings Section */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3 className="settings-card-title">AI Assistant Settings</h3>
          <div className="ai-status-indicator">
            <div 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor() }}
            />
            <span className="status-text">{getStatusText()}</span>
          </div>
        </div>
        
        {availableModels?.system_info && (
          <div className="system-info-card">
            <div className="system-info-row">
              <span>System RAM:</span>
              <span>{availableModels.system_info.total_ram_gb.toFixed(1)} GB</span>
            </div>
            <div className="system-info-row">
              <span>Recommended:</span>
              <span>{getModelDisplayName(availableModels.system_info.recommended_model)}</span>
            </div>
          </div>
        )}

        <div className="setting-group">
          <label className="setting-label">AI Model Selection</label>
          
          {/* ✅ LLAMA MODELS GROUP */}
          <div className="model-provider-section">
            <h4 className="model-provider-title">🦙 Meta Llama Models</h4>
            <div className="model-selection-grid">
              {modelGroups.llama.map((model) => (
                <div 
                  key={model}
                  className={`model-option ${aiModel === model ? 'selected' : ''} ${!canRunModel(model) ? 'disabled' : ''}`}
                  onClick={() => canRunModel(model) && setAiModel(model)}
                >
                  <div className="model-option-header">
                    <span className="model-name">{getModelDisplayName(model)}</span>
                    {availableModels?.system_info.recommended_model === model && (
                      <span className="recommended-badge">Recommended</span>
                    )}
                  </div>
                  <p className="model-description">{getModelDescription(model)}</p>
                  {!canRunModel(model) && (
                    <div className="model-warning">
                      Requires more system resources
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ✅ DEEPSEEK MODELS GROUP */}
          <div className="model-provider-section">
            <h4 className="model-provider-title">🧠 DeepSeek Reasoning Models</h4>
            <div className="model-selection-grid">
              {modelGroups.deepseek.map((model) => (
                <div 
                  key={model}
                  className={`model-option ${aiModel === model ? 'selected' : ''} ${!canRunModel(model) ? 'disabled' : ''}`}
                  onClick={() => canRunModel(model) && setAiModel(model)}
                >
                  <div className="model-option-header">
                    <span className="model-name">{getModelDisplayName(model)}</span>
                    {model === "deepseek-r1:7b" && availableModels?.system_info.total_ram_gb >= 6 && (
                      <span className="recommended-badge">Best Value</span>
                    )}
                  </div>
                  <p className="model-description">{getModelDescription(model)}</p>
                  {!canRunModel(model) && (
                    <div className="model-warning">
                      Requires more system resources
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Manager */}
      <ModelManager />

      {/* Appearance Settings */}
      <div className="settings-card">
        <h3 className="settings-card-title">Appearance</h3>
        
        <div className="setting-group">
          <label className="setting-label">Theme</label>
          <div className="theme-selector">
            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              🌙 Dark
            </button>
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              ☀️ Light
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">Background</label>
          <select 
            className="setting-select"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="mountain">Mountain</option>
            <option value="city">City</option>
            <option value="space">Space</option>
          </select>
        </div>
      </div>

      {/* Save Section */}
      <div className="settings-actions">
        {message && (
          <div className={`settings-message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="save-settings-btn"
        >
          {saving ? (
            <span className="saving-text">
              <div className="spinner" />
              Saving...
            </span>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
