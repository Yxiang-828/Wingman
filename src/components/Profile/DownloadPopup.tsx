import React from "react";
import "./DownloadPopup.css";

interface DownloadPopupProps {
  modelName: string;
  progress: number;
  status: string;
  downloadSpeed?: number;
}

const DownloadPopup: React.FC<DownloadPopupProps> = ({
  modelName,
  progress,
  status,
  downloadSpeed = 0,
}) => {
  return (
    <div className="download-popup-overlay">
      <div className="download-popup-container">
        <div className="download-popup-header">
          <h2>📥 Downloading Model</h2>
          <p>Please wait while we download your AI model...</p>
        </div>

        <div className="download-popup-content">
          <div className="download-model-info">
            <h3>{modelName}</h3>
          </div>

          <div className="download-progress-section">
            <div className="progress-header">
              <span>{status}</span>
              <span>{progress.toFixed(1)}%</span>
            </div>

            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="progress-details">
              <span>Speed: {downloadSpeed.toFixed(1)} MB/s</span>
              <span>Do not close the application</span>
            </div>
          </div>

          <div className="download-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPopup;