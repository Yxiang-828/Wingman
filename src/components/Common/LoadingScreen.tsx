import React from "react";
import "./LoadingScreen.css";

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen Component
 * Full-screen loading overlay with animated progress indicators
 * Displays while Wingman works in the background
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Your Wingman is preparing...",
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner-large"></div>
        <p className="loading-message">{message}</p>
        <div className="loading-progress">
          <div className="loading-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
