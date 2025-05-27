export interface MoodState {
  current: 'productive' | 'chill' | 'focused' | 'creative' | 'energetic';
  lastChanged: number;
  changeInterval: number; // Minutes between mood changes
}

// Add the missing ActivityData interface
export interface ActivityData {
  taskCompletionRate?: number;
  eventAttendance?: number;
  diaryEntryCount?: number;
  focusTime?: number;
  mood?: string;
}

export class MoodManager {
  private moodState: MoodState;
  private readonly MOODS = ['productive', 'chill', 'focused', 'creative', 'energetic'] as const;
  private readonly MOOD_WEIGHTS = {
    productive: 0.25,
    chill: 0.25,
    focused: 0.20,
    creative: 0.15,
    energetic: 0.15
  };

  constructor() {
    this.moodState = this.loadMoodState();
    this.startMoodTimer();
  }

  private loadMoodState(): MoodState {
    const saved = localStorage.getItem('wingman-mood-state');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      current: 'productive',
      lastChanged: Date.now(),
      changeInterval: this.getRandomInterval() // 15-45 minutes
    };
  }

  private saveMoodState(): void {
    localStorage.setItem('wingman-mood-state', JSON.stringify(this.moodState));
  }

  private getRandomInterval(): number {
    // Random interval between 15-45 minutes
    return Math.floor(Math.random() * (45 - 15 + 1)) + 15;
  }

  private getWeightedRandomMood(): typeof this.MOODS[number] {
    // Time-based mood adjustments
    const hour = new Date().getHours();
    const adjustedWeights = { ...this.MOOD_WEIGHTS };

    // Morning boost for energetic/productive
    if (hour >= 6 && hour <= 10) {
      adjustedWeights.energetic += 0.1;
      adjustedWeights.productive += 0.1;
      adjustedWeights.chill -= 0.1;
    }
    
    // Afternoon focus time
    else if (hour >= 13 && hour <= 17) {
      adjustedWeights.focused += 0.15;
      adjustedWeights.productive += 0.05;
      adjustedWeights.chill -= 0.1;
    }
    
    // Evening chill time
    else if (hour >= 18 || hour <= 5) {
      adjustedWeights.chill += 0.2;
      adjustedWeights.creative += 0.1;
      adjustedWeights.productive -= 0.15;
    }

    // Avoid repeating the same mood
    if (this.moodState.current) {
      adjustedWeights[this.moodState.current] *= 0.3; // Reduce chance of same mood
    }

    // Weighted random selection
    const random = Math.random();
    let cumulative = 0;
    
    for (const [mood, weight] of Object.entries(adjustedWeights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return mood as typeof this.MOODS[number];
      }
    }
    
    return 'productive'; // Fallback
  }

  private changeMood(): void {
    const newMood = this.getWeightedRandomMood();
    const oldMood = this.moodState.current;
    
    this.moodState.current = newMood;
    this.moodState.lastChanged = Date.now();
    this.moodState.changeInterval = this.getRandomInterval();
    
    this.saveMoodState();
    
    // Notify components about mood change
    window.dispatchEvent(new CustomEvent('mood-changed', { 
      detail: { oldMood, newMood } 
    }));
    
    // Notify Electron main process
    if (window.electronAPI) {
      // Use type assertion to help TypeScript recognize the send method
      (window.electronAPI as any).send('mood-changed', newMood);
    }
    
    console.log(`🎭 Mood changed from ${oldMood} to ${newMood}`);
  }

  private startMoodTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastChange = now - this.moodState.lastChanged;
      const intervalMs = this.moodState.changeInterval * 60 * 1000;
      
      if (timeSinceLastChange >= intervalMs) {
        this.changeMood();
      }
    }, 60 * 1000); // Check every minute
  }

  public getCurrentMood(): typeof this.MOODS[number] {
    return this.moodState.current;
  }

  public forceMoodChange(): void {
    this.changeMood();
  }

  public getTimeUntilNextChange(): number {
    const now = Date.now();
    const timeSinceLastChange = now - this.moodState.lastChanged;
    const intervalMs = this.moodState.changeInterval * 60 * 1000;
    
    return Math.max(0, intervalMs - timeSinceLastChange);
  }
}

export const moodManager = new MoodManager();

// Add the missing calculateMood function
function calculateMood(activity: ActivityData): string {
  // Simple algorithm to determine mood based on activity data
  if (!activity) return 'productive'; // Default mood
  
  if (activity.taskCompletionRate && activity.taskCompletionRate > 0.7) {
    return 'productive';
  }
  
  if (activity.focusTime && activity.focusTime > 120) {
    return 'focused';
  }
  
  if (activity.diaryEntryCount && activity.diaryEntryCount > 2) {
    return 'creative';
  }
  
  if (activity.eventAttendance && activity.eventAttendance > 0.8) {
    return 'energetic';
  }
  
  // Default fallback mood
  return 'chill';
}

// Fixed function to use type assertion for window.electronAPI.send
export function updateMoodBasedOnActivity(activity: ActivityData): string {
  const newMood = calculateMood(activity);
  
  // Use type assertion to help TypeScript recognize the send method
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      (window.electronAPI as any).send?.('mood-changed', newMood);
    } catch (error) {
      console.warn('Failed to send mood to Electron:', error);
    }
  }
  
  return newMood;
}