interface ElectronAPI {
  onMoodChange: (callback: (mood: string) => void) => () => void; // Returns a cleanup function
  setMaxMoodListeners: (count: number) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}