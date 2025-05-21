interface ElectronAPI {
  onMoodChange: (callback: (mood: string) => void) => void;
  setMaxMoodListeners: (count: number) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}