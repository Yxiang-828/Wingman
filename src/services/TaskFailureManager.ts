import { getTodayDateString, getCurrentTimeString } from '../utils/timeUtils';
import { getCurrentUserId } from '../utils/helpers';

interface TaskFailureManagerConfig {
  checkIntervalMs: number;
  enableLogging: boolean;
}

interface FailureDetectionResult {
  failedTaskIds: number[];
  totalChecked: number;
  totalFailed: number;
  affectedDate: string;
}

class TaskFailureManager {
  private static instance: TaskFailureManager | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: TaskFailureManagerConfig;
  private lastCheckTime: string = '';
  
  // Track cleanup state to prevent memory leaks
  private isDestroyed: boolean = false;
  private cleanupCallbacks: Array<() => void> = [];

  private constructor(config: Partial<TaskFailureManagerConfig> = {}) {
    this.config = {
      checkIntervalMs: 60 * 1000, // 60 seconds
      enableLogging: true,
      ...config
    };
    
    // Register cleanup handlers
    this.registerCleanupHandlers();
  }

  /**
   * Get singleton instance of TaskFailureManager
   */
  public static getInstance(config?: Partial<TaskFailureManagerConfig>): TaskFailureManager {
    if (!TaskFailureManager.instance) {
      TaskFailureManager.instance = new TaskFailureManager(config);
    }
    return TaskFailureManager.instance;
  }

  /**
   * Start the centralized task failure detection
   */
  public start(): void {
    if (this.isRunning) {
      this.log('⚠️ TaskFailureManager: Already running');
      return;
    }

    this.log('🚀 TaskFailureManager: Starting centralized task failure detection');
    
    // Run initial check right away
    this.checkForFailedTasks();
    
    // Calculate delay to next minute boundary for synchronized checking
    const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds();
    const millisecondsUntilNextMinute = (secondsUntilNextMinute * 1000) - now.getMilliseconds();
    
    this.log(`⏰ Next check in ${secondsUntilNextMinute} seconds (at next minute boundary)`);
    
    // Set timeout to start interval at next minute boundary
    setTimeout(() => {
      this.log('🎯 TaskFailureManager: Now running on minute boundaries');
      
      // Now set up interval to run every minute exactly at seconds=0
      this.intervalId = setInterval(() => {
        this.checkForFailedTasks();
      }, 60 * 1000); // 60 seconds
      
    }, millisecondsUntilNextMinute);
    
    this.isRunning = true;
  }
  /**
   * Stop the task failure detection with enhanced cleanup
   */
  public stop(): void {
    if (this.isDestroyed) {
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    this.lastCheckTime = '';
    
    this.log('⏹️ TaskFailureManager: Stopped with enhanced cleanup');
  }

  /**
   * Main failure detection logic - runs every 60 seconds
   */
  private async checkForFailedTasks(): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        this.log('👤 TaskFailureManager: No authenticated user, skipping check');
        return;
      }

      const currentTime = getCurrentTimeString();
      const today = getTodayDateString();
      this.lastCheckTime = currentTime;

      this.log(`🔍 TaskFailureManager: Checking for failed tasks at ${currentTime}`);

      // Fetch all pending tasks for today
      const allTasks = await window.electronAPI.db.getTasks(userId, today);
      
      if (!allTasks || allTasks.length === 0) {
        this.log('📋 TaskFailureManager: No tasks found for today');
        return;
      }

      // Apply standardized failure detection logic
      const failedTasks = this.detectFailedTasks(allTasks, currentTime);

      if (failedTasks.length === 0) {
        this.log(`✅ TaskFailureManager: No failed tasks detected (checked ${allTasks.length} tasks)`);
        return;
      }

      // Batch update failed tasks
      const result = await this.batchUpdateFailedTasks(failedTasks);

      // Dispatch refresh events to components
      this.dispatchRefreshEvents(result);

    } catch (error) {
      console.error('❌ TaskFailureManager: Error during failure check:', error);
    }
  }

  /**
   * Standardized failure detection logic
   */
  private detectFailedTasks(tasks: any[], currentTime: string): any[] {
    const failedTasks: any[] = [];
    
    for (const task of tasks) {
      // Skip if already completed or already failed
      if (task.completed || task.failed) {
        continue;
      }

      // Skip if no time specified or all-day task
      if (!task.task_time || task.task_time === 'All day') {
        continue;
      }

      // Check if task time has passed
      if (task.task_time < currentTime) {
        failedTasks.push(task);
        this.log(`⏰ Task ${task.id} failed: "${task.title}" (${task.task_time} < ${currentTime})`);
      }
    }
    
    return failedTasks;
  }

  /**
   * Batch update failed tasks in a single transaction
   */
  private async batchUpdateFailedTasks(tasks: any[]): Promise<FailureDetectionResult> {
    const failedTaskIds: number[] = [];
    let successCount = 0;
    
    this.log(`📦 Batch updating ${tasks.length} failed tasks`);
    
    // Update each task individually (SQLite doesn't support true batch updates via our API)
    for (const task of tasks) {
      try {
        await window.electronAPI.db.updateTask(task.id, {
          failed: true,
          updated_at: new Date().toISOString()
        });
        
        failedTaskIds.push(task.id);
        successCount++;
        
        this.log(`✅ Marked task ${task.id} as failed: "${task.title}"`);
      } catch (error) {
        console.error(`❌ Failed to update task ${task.id}:`, error);
      }
    }
    
    this.log(`✅ Successfully marked ${successCount}/${tasks.length} tasks as failed`);
    
    return {
      failedTaskIds,
      totalChecked: tasks.length,
      totalFailed: successCount,
      affectedDate: getTodayDateString()
    };
  }

  /**
   * Dispatch targeted refresh events to components
   */
  private dispatchRefreshEvents(result: FailureDetectionResult): void {
    if (result.totalFailed === 0) {
      return;
    }

    this.log(`📡 Dispatching refresh events for ${result.totalFailed} failed tasks`);

    // Create event with detailed information
    const eventDetail = {
      failedTaskIds: result.failedTaskIds,
      totalFailed: result.totalFailed,
      affectedDate: result.affectedDate,
      timestamp: Date.now()
    };

    // Dispatch specific event for task failures
    const taskFailureEvent = new CustomEvent('tasks-failed-update', {
      detail: eventDetail
    });
    window.dispatchEvent(taskFailureEvent);

    // Dispatch general refresh events for components
    const dashboardEvent = new CustomEvent('dashboard-refresh', {
      detail: eventDetail
    });
    window.dispatchEvent(dashboardEvent);

    const notificationsEvent = new CustomEvent('notifications-refresh', {
      detail: eventDetail
    });
    window.dispatchEvent(notificationsEvent);

    this.log(`📡 Refresh events dispatched successfully`);
  }

  /**
   * Get current status of the manager
   */
  public getStatus(): {
    isRunning: boolean;
    lastCheckTime: string;
    intervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      intervalMs: this.config.checkIntervalMs
    };
  }

  /**
   * Force immediate check (for testing/debugging)
   */
  public async forceCheck(): Promise<void> {
    this.log('🔧 TaskFailureManager: Force check triggered');
    await this.checkForFailedTasks();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<TaskFailureManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log(`⚙️ TaskFailureManager: Configuration updated`, this.config);
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[TaskFailureManager] ${message}`, ...args);
    }
  }

  // Register cleanup handlers to prevent memory leaks
  private registerCleanupHandlers(): void {
    // Handle window unload
    const handleUnload = () => {
      this.destroy();
    };
    
    // Register event listeners
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    
    // Store cleanup callbacks
    this.cleanupCallbacks.push(() => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
    });
  }

  // Destroy instance and cleanup all resources
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.log('🔧 TaskFailureManager: Destroying instance and cleaning up');
    
    // Stop the service
    this.stop();
    
    // Run all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Error in cleanup callback:', error);
      }
    });
    
    // Clear arrays
    this.cleanupCallbacks = [];
    
    // Mark as destroyed
    this.isDestroyed = true;
    
    // Clear singleton instance
    TaskFailureManager.instance = null;
  }
}

// Export singleton instance getter
export const getTaskFailureManager = (config?: Partial<TaskFailureManagerConfig>) => {
  return TaskFailureManager.getInstance(config);
};

export default TaskFailureManager;