// REPLACE ALL {...} PLACEHOLDERS WITH THIS WORKING CODE:

import React, { useState, useEffect } from "react";
import { getCurrentUserId } from "../../utils/auth";
import { llmService } from "../../services/llmService";
import "./ModelManager.css";

interface DownloadedModel {
  name: string;
  model_name?: string;
  size?: number;
  size_mb?: number;
  modified?: string;
  digest?: string;
  status: string;
  download_date?: string;
}

interface ModelDownloadProgress {
  model_name: string;
  progress: number;
  download_speed_mbps: number;
  estimated_time_remaining: number;
  status: string;
  size_downloaded: number;
  total_size: number;
}

interface AvailableModel {
  name: string;
  displayName: string;
  description: string;
  size: string;
  ramRequired: number;
  provider: string;
  recommended?: boolean;
}

const ModelManager: React.FC = () => {
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModel[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, ModelDownloadProgress>>({});
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  const availableModels: AvailableModel[] = [
    {
      name: "deepseek-r1:1.5b",
      displayName: "DeepSeek R1 1.5B (Ultra Fast)",
      description: "Lightning-fast reasoning model. Excellent for coding, math, and quick problem-solving.",
      size: "0.9GB",
      ramRequired: 2,
      provider: "DeepSeek",
    },
    {
      name: "llama3.2:1b",
      displayName: "Llama 3.2 1B (Fast & Light)",
      description: "Fastest responses, lower resource usage. Great for quick tasks and systems with limited RAM.",
      size: "1.3GB",
      ramRequired: 2,
      provider: "Meta",
    },
    {
      name: "llama3.2:3b",
      displayName: "Llama 3.2 3B (Balanced)",
      description: "Balanced performance and intelligence. Recommended for most users with 8GB+ RAM.",
      size: "2.0GB",
      ramRequired: 4,
      provider: "Meta",
    },
    {
      name: "deepseek-r1:7b",
      displayName: "DeepSeek R1 7B (Reasoning Pro)",
      description: "Advanced reasoning capabilities. Superior logic and analytical thinking for complex tasks.",
      size: "4.1GB",
      ramRequired: 6,
      provider: "DeepSeek",
      recommended: true,
    },
    {
      name: "llama3.2:8b",
      displayName: "Llama 3.2 8B (Advanced)",
      description: "Most intelligent responses, requires more resources. Best for complex tasks with 16GB+ RAM.",
      size: "4.9GB",
      ramRequired: 8,
      provider: "Meta",
    },
    {
      name: "deepseek-r1:14b",
      displayName: "DeepSeek R1 14B (Logic Master)",
      description: "Master-level reasoning model. Exceptional at complex problem-solving and research tasks.",
      size: "8.2GB",
      ramRequired: 12,
      provider: "DeepSeek",
    },
  ];

  useEffect(() => {
    loadDownloadedModels();
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const models = await llmService.getModels();
      setSystemInfo(models.system_info);
    } catch (error) {
      console.error("Failed to load system info:", error);
    }
  };

  const loadDownloadedModels = async () => {
    try {
      console.log("🔄 Loading downloaded models...");
      const userId = getCurrentUserId();
      if (!userId) return;

      // Get data from both sources
      const [dbModels, ollamaResponse] = await Promise.all([
        window.electronAPI.db.getDownloadedModels(userId),
        llmService.getDownloadedModels()
      ]);

      console.log("📊 Database models:", dbModels);
      console.log("📊 Ollama response:", ollamaResponse);

      const mergedModels: DownloadedModel[] = [];

      // Process Ollama models (primary source of truth)
      if (ollamaResponse && ollamaResponse.models && Array.isArray(ollamaResponse.models)) {
        ollamaResponse.models.forEach((model: any) => {
          mergedModels.push({
            name: model.name,
            size: model.size,
            size_mb: model.size ? Math.round(model.size / (1024 * 1024)) : 0,
            modified: model.modified,
            digest: model.digest,
            status: 'completed'
          });
        });
      }

      console.log("✅ Merged models:", mergedModels);
      setDownloadedModels(mergedModels);
    } catch (error) {
      console.error("❌ Failed to load downloaded models:", error);
      setDownloadedModels([]);
    }
  };

  const handleDownloadModel = async (modelName: string) => {
    try {
      setLoading(true);
      console.log(`🔄 Starting download for model: ${modelName}`);

      // Initialize progress tracking
      setDownloadProgress(prev => ({
        ...prev,
        [modelName]: {
          model_name: modelName,
          progress: 0,
          download_speed_mbps: 0,
          estimated_time_remaining: 0,
          status: "starting",
          size_downloaded: 0,
          total_size: 0,
        }
      }));

      // Start the download
      const result = await llmService.pullModel(modelName);
      console.log(`📥 Download result:`, result);

      if (result.success !== false) {
        // Start progress monitoring
        const progressInterval = setInterval(async () => {
          try {
            const progress = await llmService.getDownloadProgress(modelName);
            console.log(`📊 Progress for ${modelName}:`, progress);
            
            setDownloadProgress(prev => ({
              ...prev,
              [modelName]: {
                model_name: modelName,
                progress: progress.progress || 0,
                download_speed_mbps: progress.download_speed_mbps || 0,
                estimated_time_remaining: progress.estimated_time_remaining || 0,
                status: progress.status || "downloading",
                size_downloaded: progress.size_downloaded || 0,
                total_size: progress.total_size || 0,
              }
            }));

            // Stop monitoring when complete
            if (progress.status === "completed" || progress.progress >= 100) {
              clearInterval(progressInterval);
              setDownloadProgress(prev => {
                const newState = { ...prev };
                delete newState[modelName];
                return newState;
              });
              
              // Save to database
              const userId = getCurrentUserId();
              if (userId) {
                await window.electronAPI.db.saveDownloadedModel(userId, {
                  model_name: modelName,
                  size_mb: Math.round((progress.total_size || 0) / (1024 * 1024)),
                  status: 'completed'
                });
              }
              
              // Refresh models list
              loadDownloadedModels();
            }
          } catch (progressError) {
            console.error("Progress check error:", progressError);
          }
        }, 2000);

        // Set timeout to stop monitoring after 10 minutes
        setTimeout(() => clearInterval(progressInterval), 600000);
      } else {
        setDownloadProgress(prev => {
          const newState = { ...prev };
          delete newState[modelName];
          return newState;
        });
      }
    } catch (error) {
      console.error(`❌ Download error for ${modelName}:`, error);
      setDownloadProgress(prev => {
        const newState = { ...prev };
        delete newState[modelName];
        return newState;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete ${modelName}? This will free up disk space.`)) {
      return;
    }

    try {
      console.log(`🗑️ Starting delete for model: ${modelName}`);
      const userId = getCurrentUserId();

      // Delete from Ollama
      const ollamaResult = await llmService.deleteModel(modelName);
      console.log(`🗑️ Ollama delete result:`, ollamaResult);

      // Delete from database
      const dbResult = userId ? await window.electronAPI.db.deleteDownloadedModel(userId, modelName) : { changes: 0 };
      console.log(`🗑️ Database delete result:`, dbResult);

      // Refresh models list
      loadDownloadedModels();
      console.log(`✅ Delete completed for ${modelName}`);
    } catch (error) {
      console.error(`❌ Delete error for ${modelName}:`, error);
    }
  };

  const canRunModel = (model: AvailableModel) => {
    if (!systemInfo?.total_ram_gb) return true;
    return systemInfo.total_ram_gb >= model.ramRequired;
  };

  const isModelDownloaded = (modelName: string) => {
    return downloadedModels.some((m) => m.name === modelName || m.model_name === modelName);
  };

  const getRecommendedModel = () => {
    if (!systemInfo?.total_ram_gb) return null;

    const ramGb = systemInfo.total_ram_gb;

    if (ramGb >= 12) return availableModels.find((m) => m.name === "deepseek-r1:14b");
    if (ramGb >= 8) return availableModels.find((m) => m.name === "deepseek-r1:7b");
    if (ramGb >= 4) return availableModels.find((m) => m.name === "llama3.2:3b");
    
    return availableModels.find((m) => m.name === "deepseek-r1:1.5b");
  };

  const recommendedModel = getRecommendedModel();

  const formatSize = (model: DownloadedModel): string => {
    if (model.size_mb && model.size_mb > 0) {
      return `${model.size_mb.toFixed(0)} MB`;
    }
    if (model.size && model.size > 0) {
      return `${Math.round(model.size / (1024 * 1024))} MB`;
    }
    return "Unknown size";
  };

  const formatDate = (model: DownloadedModel): string => {
    const date = model.download_date || model.modified;
    if (!date) return "Unknown date";
    
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="model-manager">
      <h3>AI Model Manager</h3>
      
      {/* System Info */}
      {systemInfo && (
        <div className="system-info-banner">
          <h4>System Information</h4>
          <div className="system-stats">
            <span>RAM: {systemInfo.total_ram_gb}GB</span>
            <span>Recommended: {systemInfo.recommended_model}</span>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {Object.entries(downloadProgress).length > 0 && (
        <div className="section">
          <h4>Download Progress</h4>
          {Object.entries(downloadProgress).map(([modelName, progress]) => (
            <div key={modelName} className="download-progress">
              <div className="progress-header">
                <span>{modelName}</span>
                <span>{(progress.progress || 0).toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.progress || 0}%` }}
                />
              </div>
              <div className="progress-details">
                <span>Status: {progress.status}</span>
                <span>Speed: {progress.download_speed_mbps.toFixed(1)} MB/s</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Downloaded Models */}
      <div className="section">
        <h4>Downloaded Models</h4>
        {downloadedModels.length > 0 ? (
          <div className="downloaded-models-list">
            {downloadedModels.map((model) => (
              <div key={model.name} className="model-item">
                <div className="model-info">
                  <div className="model-name">{model.name}</div>
                  <div className="model-size">{formatSize(model)}</div>
                  <div className="model-date">Downloaded: {formatDate(model)}</div>
                </div>
                <button
                  className="delete-model-btn"
                  onClick={() => handleDeleteModel(model.name)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No models downloaded yet</div>
        )}
      </div>

      {/* Available Models */}
      <div className="section">
        <h4>Available Models</h4>
        <div className="available-models-grid">
          {availableModels.map((model) => {
            const downloaded = isModelDownloaded(model.name);
            const canRun = canRunModel(model);
            const isRecommended = recommendedModel?.name === model.name;

            return (
              <div
                key={model.name}
                className={`model-card ${downloaded ? 'downloaded' : ''} ${!canRun ? 'disabled' : ''} ${isRecommended ? 'recommended' : ''}`}
              >
                <div className="model-card-header">
                  <div className="model-title">
                    <h4>{model.displayName}</h4>
                    <div className="model-provider">{model.provider}</div>
                  </div>
                  {isRecommended && <span className="recommended-badge">Recommended</span>}
                </div>
                
                <p className="model-description">{model.description}</p>
                
                <div className="model-specs">
                  <span className="spec">Size: {model.size}</span>
                  <span className="spec">RAM: {model.ramRequired}GB+</span>
                </div>
                
                {!canRun && (
                  <div className="model-warning">
                    Requires {model.ramRequired}GB+ RAM
                  </div>
                )}
                
                <div className="model-actions">
                  {downloaded ? (
                    <button className="action-btn downloaded" disabled>
                      ✓ Downloaded
                    </button>
                  ) : (
                    <button
                      className="action-btn download"
                      onClick={() => handleDownloadModel(model.name)}
                      disabled={!canRun || loading}
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModelManager;