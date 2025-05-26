/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declare global Electron API interface
interface Window {
  electronAPI?: {
    onMoodChange: (callback: (mood: string) => void) => void;
    setMaxMoodListeners: (count: number) => void; // This property is included
  }
}
