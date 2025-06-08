import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen Component - Your Wingman's Patience Display
 * Full-screen loading overlay with animated progress indicators
 * Shows while your faithful assistant prepares the battlefield
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Your Wingman is preparing...' 
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