import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppConfigContextType {
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  apiBaseUrl: string;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('/api');

  // Check if we're running in Electron
  const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;

  useEffect(() => {
    // Load previously saved mode
    const savedMode = localStorage.getItem('offlineMode');
    if (savedMode) {
      setIsOfflineMode(savedMode === 'true');
    } else if (isElectron) {
      // Default to offline mode in Electron
      setIsOfflineMode(true);
    }
  }, []);

  useEffect(() => {
    // Update API base URL when mode changes
    if (isOfflineMode) {
      setApiBaseUrl('http://localhost:8000/api');
    } else {
      setApiBaseUrl('/api');
    }
    
    // Save current mode
    localStorage.setItem('offlineMode', String(isOfflineMode));
  }, [isOfflineMode]);

  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => !prev);
  };

  return (
    <AppConfigContext.Provider value={{ isOfflineMode, toggleOfflineMode, apiBaseUrl }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};