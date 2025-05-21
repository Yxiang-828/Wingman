// This component loads user font preferences on app start

import { useEffect } from 'react';

const FontSizeInitializer = () => {
  useEffect(() => {
    // Load font size settings from localStorage
    const applyFontSettings = () => {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          const fontSizes = settings.fontSizes;
          
          if (fontSizes) {
            const root = document.documentElement;
            
            if (fontSizes.diaryTitle) {
              root.style.setProperty('--diary-title-size', `${fontSizes.diaryTitle}rem`);
            }
            
            if (fontSizes.diaryContent) {
              root.style.setProperty('--diary-content-size', `${fontSizes.diaryContent}rem`);
            }
            
            if (fontSizes.diaryMeta) {
              root.style.setProperty('--diary-meta-size', `${fontSizes.diaryMeta}rem`);
            }
            
            if (fontSizes.diaryEntryTitle) {
              root.style.setProperty('--diary-entry-title-size', `${fontSizes.diaryEntryTitle}rem`);
            }
          }
        } catch (e) {
          console.error("Failed to parse saved font settings:", e);
        }
      }
    };
    
    // Apply settings immediately
    applyFontSettings();
    
    // Also listen for storage changes (in case user has multiple tabs open)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userSettings') {
        applyFontSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default FontSizeInitializer;