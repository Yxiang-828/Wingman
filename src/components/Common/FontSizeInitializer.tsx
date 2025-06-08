// This component loads user font preferences on app start

import { useEffect } from 'react';

/**
 * FontSizeInitializer Component - Your Wingman's Typography Controller
 * Loads and applies user font preferences from persistent storage
 * Ensures consistent text sizing across your command center
 */
const FontSizeInitializer = () => {
  useEffect(() => {
    /**
     * Applies saved font settings to CSS custom properties
     * Your Wingman remembers exactly how you like your text displayed
     */
    const applyFontSettings = () => {
      try {
        const savedSettings = localStorage.getItem('userSettings');
        if (!savedSettings) return;

        const settings = JSON.parse(savedSettings);
        const fontSizes = settings.fontSizes;
        
        if (!fontSizes) return;

        const root = document.documentElement;
        
        // Apply diary-specific font sizes with fallback values
        const fontMappings = {
          'diaryTitle': '--diary-title-size',
          'diaryContent': '--diary-content-size', 
          'diaryMeta': '--diary-meta-size',
          'diaryEntryTitle': '--diary-entry-title-size'
        };

        Object.entries(fontMappings).forEach(([key, cssVar]) => {
          if (fontSizes[key]) {
            root.style.setProperty(cssVar, `${fontSizes[key]}rem`);
          }
        });

        console.log("Wingman: Font preferences applied successfully");
      } catch (error) {
        console.error("Wingman: Failed to parse font settings:", error);
        // Reset to defaults if parsing fails
        document.documentElement.style.removeProperty('--diary-title-size');
        document.documentElement.style.removeProperty('--diary-content-size');
        document.documentElement.style.removeProperty('--diary-meta-size');
        document.documentElement.style.removeProperty('--diary-entry-title-size');
      }
    };
    
    // Apply settings immediately on component mount
    applyFontSettings();
    
    /**
     * Handles cross-tab font setting synchronization
     * Your Wingman stays consistent across multiple windows
     */
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userSettings') {
        applyFontSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Invisible component - pure functionality
  return null;
};

export default FontSizeInitializer;