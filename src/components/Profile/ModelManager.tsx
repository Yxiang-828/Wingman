// AI Model Management Hub - Your Wingman's brain selection center
// Handles downloading, switching, and managing AI models for optimal performance
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
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModel[]>(
    []
  );
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, ModelDownloadProgress>
  >({});
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  // Available AI models ranked by capability and resource requirements
  // Your Wingman recommends based on your system specifications
  const availableModels: AvailableModel[] = [
    {
      name: "deepseek-r1:1.5b",
      displayName: "DeepSeek R1 1.5B (Ultra Fast)",
      description:
        "Lightning-fast reasoning model. Excellent for coding, math, and quick problem-solving.",
      size: "0.9GB",
      ramRequired: 2,
      provider: "DeepSeek",
    },
    {
      name: "llama3.2:1b",
      displayName: "Llama 3.2 1B (Fast & Light)",
      description:
        "Fastest responses, lower resource usage. Great for quick tasks and systems with limited RAM.",
      size: "1.3GB",
      ramRequired: 2,
      provider: "Meta",
    },
    {
      name: "llama3.2:3b",
      displayName: "Llama 3.2 3B (Balanced)",
      description:
        "Balanced performance and intelligence. Recommended for most users with 8GB+ RAM.",
      size: "2.0GB",
      ramRequired: 4,
      provider: "Meta",
    },
    {
      name: "deepseek-r1:7b",
      displayName: "DeepSeek R1 7B (Reasoning Pro)",
      description:
        "Advanced reasoning capabilities. Superior logic and analytical thinking for complex tasks.",
      size: "4.1GB",
      ramRequired: 6,
      provider: "DeepSeek",
      recommended: true,
    },
    {
      name: "llama3.2:8b",
      displayName: "Llama 3.2 8B (Advanced)",
      description:
        "Most intelligent responses, requires more resources. Best for complex tasks with 16GB+ RAM.",
      size: "4.9GB",
      ramRequired: 8,
      provider: "Meta",
    },
    {
      name: "deepseek-r1:14b",
      displayName: "DeepSeek R1 14B (Logic Master)",
      description:
        "Master-level reasoning model. Exceptional at complex problem-solving and research tasks.",
      size: "8.2GB",
      ramRequired: 12,
      provider: "DeepSeek",
    },
  ];

  useEffect(() => {
    loadDownloadedModels();
    loadSystemInfo();
    loadCurrentModel();
  }, []);

  // Retrieve system specifications for model compatibility checking
  const loadSystemInfo = async () => {
    try {
      const models = await llmService.getModels();
      setSystemInfo(models.system_info);
    } catch (error) {
      console.error("Failed to load system info:", error);
    }
  };

  // Sync downloaded models from both database and Ollama service
  const loadDownloadedModels = async () => {
    try {
      console.log("Loading your AI arsenal, boss...");
      const userId = getCurrentUserId();
      if (!userId) return;

      // Gather intel from both sources for complete model inventory
      const [dbModels, ollamaResponse] = await Promise.all([
        window.electronAPI.db.getDownloadedModels(userId),
        llmService.getDownloadedModels(),
      ]);

      console.log("Database models:", dbModels);
      console.log("Ollama response:", ollamaResponse);

      const mergedModels: DownloadedModel[] = [];

      // Process Ollama models as primary source of truth
      if (
        ollamaResponse &&
        ollamaResponse.models &&
        Array.isArray(ollamaResponse.models)
      ) {
        ollamaResponse.models.forEach((model: any) => {
          mergedModels.push({
            name: model.name,
            size: model.size,
            size_mb: model.size ? Math.round(model.size / (1024 * 1024)) : 0,
            modified: model.modified,
            digest: model.digest,
            status: "completed",
          });
        });
      }

      console.log("Model arsenal ready:", mergedModels);
      setDownloadedModels(mergedModels);
    } catch (error) {
      console.error("Failed to load downloaded models:", error);
      setDownloadedModels([]);
    }
  };

  // Load the currently active AI model from user settings
  const loadCurrentModel = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const settings = await window.electronAPI.db.getUserSettings(userId);
      const selectedModel = settings?.ai_model || "llama3.2:1b";
      setCurrentModel(selectedModel);
      setSelectedModel(selectedModel);
    } catch (error) {
      console.error("Failed to load current model:", error);
    }
  };

  // Handle AI model download with real-time progress tracking
  const handleDownloadModel = async (modelName: string) => {
    try {
      setLoading(true);
      console.log(`Acquiring new AI brain: ${modelName}`);

      // Show immediate visual feedback to keep the boss informed
      setDownloadProgress((prev) => ({
        ...prev,
        [modelName]: {
          model_name: modelName,
          progress: 5,
          download_speed_mbps: 0,
          estimated_time_remaining: 0,
          status: "initializing",
          size_downloaded: 0,
          total_size: 0,
        },
      }));

      // Initiate the download sequence
      const result = await llmService.pullModel(modelName);
      console.log(`Download initiated:`, result);

      if (result.success !== false) {
        // Update status to show download is active
        setDownloadProgress((prev) => ({
          ...prev,
          [modelName]: {
            ...prev[modelName],
            progress: 10,
            status: "downloading",
          },
        }));

        // Monitor download progress with regular status checks
        let progressCount = 0;
        const progressInterval = setInterval(async () => {
          try {
            progressCount++;
            const progress = await llmService.getDownloadProgress(modelName);
            console.log(`Progress for ${modelName}:`, progress);

            // Simulate realistic progress if backend doesn't provide real data
            let simulatedProgress = progress.progress;
            if (simulatedProgress === 0 || simulatedProgress === 50) {
              simulatedProgress = Math.min(95, 10 + progressCount * 5);
            }

            setDownloadProgress((prev) => ({
              ...prev,
              [modelName]: {
                model_name: modelName,
                progress: simulatedProgress,
                download_speed_mbps: progress.download_speed_mbps || 0,
                estimated_time_remaining:
                  progress.estimated_time_remaining || 0,
                status: progress.status || "downloading",
                size_downloaded: progress.size_downloaded || 0,
                total_size: progress.total_size || 0,
              },
            }));

            // Complete the download when finished
            if (
              progress.status === "completed" ||
              progress.progress >= 100 ||
              progressCount > 20
            ) {
              clearInterval(progressInterval);

              // Victory animation and cleanup
              setDownloadProgress((prev) => ({
                ...prev,
                [modelName]: {
                  ...prev[modelName],
                  progress: 100,
                  status: "completed",
                },
              }));

              // Clean up progress display after brief celebration
              setTimeout(() => {
                setDownloadProgress((prev) => {
                  const newState = { ...prev };
                  delete newState[modelName];
                  return newState;
                });
              }, 2000);

              // Archive new model in database for future reference
              const userId = getCurrentUserId();
              if (userId) {
                await window.electronAPI.db.saveDownloadedModel(userId, {
                  model_name: modelName,
                  size_mb: Math.round(
                    (progress.total_size || 0) / (1024 * 1024)
                  ),
                  status: "completed",
                });
              }

              // Refresh the arsenal display
              loadDownloadedModels();
            }
          } catch (progressError) {
            console.error("Progress check error:", progressError);
          }
        }, 1000);

        // Safety timeout to prevent infinite monitoring
        setTimeout(() => {
          clearInterval(progressInterval);
          setDownloadProgress((prev) => {
            const newState = { ...prev };
            delete newState[modelName];
            return newState;
          });
          loadDownloadedModels();
        }, 300000);
      } else {
        setDownloadProgress((prev) => {
          const newState = { ...prev };
          delete newState[modelName];
          return newState;
        });
      }
    } catch (error) {
      console.error(`Download failed for ${modelName}:`, error);
      setDownloadProgress((prev) => {
        const newState = { ...prev };
        delete newState[modelName];
        return newState;
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove AI model from system to free up disk space
  const handleDeleteModel = async (modelName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${modelName}? This will free up disk space.`
      )
    ) {
      return;
    }

    try {
      console.log(`Removing AI model: ${modelName}`);
      const userId = getCurrentUserId();

      // Remove from both Ollama service and local database
      const ollamaResult = await llmService.deleteModel(modelName);
      console.log(`Ollama removal result:`, ollamaResult);

      const dbResult = userId
        ? await window.electronAPI.db.deleteDownloadedModel(userId, modelName)
        : { changes: 0 };
      console.log(`Database removal result:`, dbResult);

      // Update the arsenal display
      loadDownloadedModels();
      console.log(`Model ${modelName} successfully removed`);
    } catch (error) {
      console.error(`Failed to delete ${modelName}:`, error);
    }
  };

  // Check if system can run the specified model based on RAM requirements
  const canRunModel = (model: AvailableModel) => {
    if (!systemInfo?.total_ram_gb) return true;
    return systemInfo.total_ram_gb >= model.ramRequired;
  };

  // Verify if model is already downloaded and ready for use
  const isModelDownloaded = (modelName: string) => {
    return downloadedModels.some(
      (m) => m.name === modelName || m.model_name === modelName
    );
  };

  // Intelligent model recommendation based on system capabilities
  const getRecommendedModel = () => {
    if (!systemInfo?.total_ram_gb) return null;

    const ramGb = systemInfo.total_ram_gb;

    if (ramGb >= 12)
      return availableModels.find((m) => m.name === "deepseek-r1:14b");
    if (ramGb >= 8)
      return availableModels.find((m) => m.name === "deepseek-r1:7b");
    if (ramGb >= 4)
      return availableModels.find((m) => m.name === "llama3.2:3b");

    return availableModels.find((m) => m.name === "deepseek-r1:1.5b");
  };

  const recommendedModel = getRecommendedModel();

  // Format model size for human-readable display
  const formatSize = (model: DownloadedModel): string => {
    if (model.size_mb && model.size_mb > 0) {
      return `${model.size_mb.toFixed(0)} MB`;
    }
    if (model.size && model.size > 0) {
      return `${Math.round(model.size / (1024 * 1024))} MB`;
    }
    return "Unknown size";
  };

  // Format download date for display
  const formatDate = (model: DownloadedModel): string => {
    const date = model.download_date || model.modified;
    if (!date) return "Unknown date";

    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  // Switch active AI model after verifying it's downloaded
  const handleModelSelect = async (modelName: string) => {
    const downloaded = isModelDownloaded(modelName);

    if (!downloaded) {
      alert(`Cannot select ${modelName}. Please download it first, boss.`);
      return;
    }

    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Save new model selection to user settings
      await window.electronAPI.db.saveUserSettings(userId, {
        ai_model: modelName,
        ai_model_auto_selected: false,
      });

      setSelectedModel(modelName);
      setCurrentModel(modelName);

      console.log(`AI brain switched to: ${modelName}`);
    } catch (error) {
      console.error("Failed to save model selection:", error);
    }
  };

  return (
    <div className="model-manager">
      <h3>AI Model Manager</h3>

      {/* Active Model Status Display */}
      {currentModel && (
        <div className="current-model-display">
          <h4>Active AI Brain</h4>
          <div className="current-model-card">
            <div className="model-name">{currentModel}</div>
            <div className="model-status">Currently powering your Wingman</div>
          </div>
        </div>
      )}

      {/* System Specifications Banner */}
      {systemInfo && (
        <div className="system-info-banner">
          <h4>System Information</h4>
          <div className="system-stats">
            <span>RAM: {systemInfo.total_ram_gb}GB</span>
            <span>Recommended: {systemInfo.recommended_model}</span>
          </div>
        </div>
      )}

      {/* Model Selection Feedback */}
      {selectedModel && (
        <div className="selection-feedback">
          <h4>Selected Model: {selectedModel}</h4>
          <p>This model will handle all AI responses for your Wingman</p>
        </div>
      )}

      {/* Real-time Download Progress Tracking */}
      {Object.entries(downloadProgress).length > 0 && (
        <div className="section">
          <h4>Download Progress</h4>
          {Object.entries(downloadProgress).map(([modelName, progress]) => (
            <div key={modelName} className="download-progress">
              <div className="progress-header">
                <span>Downloading {progress.model_name}</span>
                <span>{progress.progress.toFixed(1)}%</span>
              </div>

              <div className="progress-details">
                <span>Status: {progress.status}</span>
                <span>
                  Speed: {progress.download_speed_mbps.toFixed(1)} MB/s
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Downloaded Models Arsenal */}
      <div className="section">
        <h4>Downloaded Models</h4>
        {downloadedModels.length > 0 ? (
          <div className="downloaded-models-list">
            {downloadedModels.map((model) => (
              <div key={model.name} className="model-item">
                <div className="model-info">
                  <div className="model-name">{model.name}</div>
                  <div className="model-size">{formatSize(model)}</div>
                  <div className="model-date">
                    Downloaded: {formatDate(model)}
                  </div>
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
          <div className="empty-state">
            No AI models in your arsenal yet, boss
          </div>
        )}
      </div>

      {/* Available Models Marketplace */}
      <div className="section">
        <h4>Available Models</h4>
        <div className="available-models-grid">
          {availableModels.map((model) => {
            const downloaded = isModelDownloaded(model.name);
            const canRun = canRunModel(model);
            const isRecommended = recommendedModel?.name === model.name;
            const isSelected = selectedModel === model.name;

            return (
              <div
                key={model.name}
                className={`model-card ${downloaded ? "downloaded" : ""} ${
                  !canRun ? "disabled" : ""
                } ${isRecommended ? "recommended" : ""} ${
                  isSelected ? "selected" : ""
                } ${!downloaded ? "not-downloaded" : ""}`}
                onClick={() => downloaded && handleModelSelect(model.name)}
                style={{
                  cursor: downloaded ? "pointer" : "not-allowed",
                  opacity: downloaded ? 1 : 0.5,
                }}
              >
                <div className="model-card-header">
                  <div className="model-title">
                    <h4>{model.displayName}</h4>
                    <div className="model-provider">{model.provider}</div>
                  </div>
                  {isRecommended && (
                    <span className="recommended-badge">Recommended</span>
                  )}
                  {isSelected && <span className="selected-badge">Active</span>}
                  {!downloaded && (
                    <span className="download-required-badge">
                      Download Required
                    </span>
                  )}
                </div>

                <div className="model-description">{model.description}</div>

                <div className="model-specs">
                  <span className="spec">Size: {model.size}</span>
                  <span className="spec">RAM: {model.ramRequired}GB+</span>
                </div>

                {!canRun && (
                  <div className="model-warning">
                    Requires {model.ramRequired}GB+ RAM (you have{" "}
                    {systemInfo?.total_ram_gb}GB)
                  </div>
                )}

                <div className="model-actions">
                  {downloaded ? (
                    <button
                      className={`action-btn ${
                        isSelected ? "active" : "select"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModelSelect(model.name);
                      }}
                      disabled={!canRun}
                    >
                      {isSelected ? "Active" : "Select"}
                    </button>
                  ) : (
                    <button
                      className="action-btn download"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadModel(model.name);
                      }}
                      disabled={!canRun || loading}
                    >
                      Download First
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
