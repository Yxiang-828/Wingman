import React, { useState, useEffect } from "react";
import { getConnectionStatus } from "../../services/hybridAuth";
import "./ConnectionStatus.css";

type ConnectionStatus = "online" | "offline" | "server-offline" | "checking";

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = "",
  showText = true,
  compact = false,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkConnection = async () => {
    try {
      const connectionStatus = await getConnectionStatus();
      setStatus(connectionStatus);
      setLastChecked(new Date());
    } catch (error) {
      setStatus("server-offline");
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Listen for online/offline events
    const handleOnline = () => {
      setTimeout(checkConnection, 1000); // Delay to allow connection to stabilize
    };

    const handleOffline = () => {
      setStatus("offline");
      setLastChecked(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getStatusInfo = () => {
    switch (status) {
      case "online":
        return {
          text: "Online",
          color: "#4CAF50",
          className: "status-online",
        };
      case "offline":
        return {
          text: "Offline",
          color: "#FF9800",
          className: "status-offline",
        };
      case "server-offline":
        return {
          text: "Server Offline",
          color: "#F44336",
          className: "status-server-offline",
        };
      case "checking":
        return {
          text: "Checking...",
          color: "#2196F3",
          className: "status-checking",
        };
      default:
        return {
          text: "Unknown",
          color: "#757575",
          className: "status-unknown",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={`connection-status ${statusInfo.className} ${compact ? "compact" : ""} ${className}`}
      title={`Last checked: ${lastChecked.toLocaleTimeString()}`}
    >
      <div
        className="status-indicator"
        style={{ backgroundColor: statusInfo.color }}
      />
      {showText && <span className="status-text">{statusInfo.text}</span>}
    </div>
  );
};

export default ConnectionStatus;
