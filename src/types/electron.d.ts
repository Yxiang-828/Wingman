export {};

declare global {
  interface Window {
    electronAPI?: {
      onMoodChange: (callback: (mood: string) => void) => () => void;
      send: (channel: string, data: any) => void;
      setMaxMoodListeners: (count: number) => void;
    };
  }
}