interface ElectronAPI {
  onMoodChange: (callback: (mood: string) => void) => void;
  setMaxMoodListeners: (count: number) => void;
  getElectronInfo: () => {
    isElectron: boolean;
    platform: string;
    version: string;
  };
}

interface Window {
  electron: {
    isElectron: boolean;
    onMoodChange: (callback: (mood: string) => void) => void;
  };
  electronAPI?: ElectronAPI;
}