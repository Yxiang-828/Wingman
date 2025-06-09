import { systemNotificationService } from './SystemNotificationService';
import { getCurrentUserId } from '../utils/auth';
import { getTodayDateString, getCurrentTimeString } from '../utils/timeUtils';

interface NotificationItem {
  id: string;
  type: 'task' | 'event';
  title: string;
  time: string;
  date: string;
  userId: string;
  notified30min?: boolean;
  notified15min?: boolean;
  notifiedOverdue?: boolean;
  notifiedStart?: boolean;
  completed?: boolean;
  failed?: boolean;
}

interface OSNotificationConfig {
  checkIntervalMs: number;
  task30minReminder: boolean;
  task15minReminder: boolean;
  event30minReminder: boolean;
  event15minReminder: boolean;
  enableLogging: boolean;
}

class OSNotificationManager {
  private static instance: OSNotificationManager | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: OSNotificationConfig;
  
  // Track all active notifications
  private activeItems: Map<string, NotificationItem> = new Map();
  private lastCheckTime: string = '';

  private constructor(config: Partial<OSNotificationConfig> = {}) {
    this.config = {
      checkIntervalMs: 60 * 1000, // Check every minute
      task30minReminder: true,
      task15minReminder: true,
      event30minReminder: true,
      event15minReminder: true,
      enableLogging: true,
      ...config
    };
  }

  public static getInstance(config?: Partial<OSNotificationConfig>): OSNotificationManager {
    if (!OSNotificationManager.instance) {
      OSNotificationManager.instance = new OSNotificationManager(config);
    }
    return OSNotificationManager.instance;
  }

  /**
   * Start the notification manager
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log('⚠️ OSNotificationManager: Already running');
      return;
    }

    this.log('🚀 OSNotificationManager: Starting notification system');
    
    // Request notification permissions
    await this.requestPermissions();
    
    // Load all current items
    await this.loadActiveItems();
    
    // Start monitoring
    this.isRunning = true;
    
    // Run initial check
    await this.processNotifications();
    
    // Set up interval to check every minute
    this.intervalId = setInterval(() => {
      this.processNotifications();
    }, this.config.checkIntervalMs);

    // Set up event listeners for real-time updates
    this.setupEventListeners();

    this.log('✅ OSNotificationManager: Started successfully');
  }

  /**
   * Stop the notification manager
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.removeEventListeners();
    this.log('⏹️ OSNotificationManager: Stopped');
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<void> {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
      
      // Also request through system service
      await systemNotificationService.requestPermission();
      
      this.log(`📋 Notification permissions: ${Notification.permission}`);
    } catch (error) {
      console.error('OSNotificationManager: Error requesting permissions:', error);
    }
  }

  /**
   * Load all active tasks and events that need monitoring
   */
  private async loadActiveItems(): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const today = getTodayDateString();
      
      // Get today's tasks and events
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today)
      ]);

      this.activeItems.clear();

      // Add tasks to monitoring
      tasks.forEach(task => {
        if (!task.completed && !task.failed && task.task_time) {
          this.activeItems.set(`task-${task.id}`, {
            id: `task-${task.id}`,
            type: 'task',
            title: task.title,
            time: task.task_time,
            date: task.task_date,
            userId: task.user_id,
            completed: task.completed,
            failed: task.failed
          });
        }
      });

      // Add events to monitoring
      events.forEach(event => {
        if (event.event_time) {
          this.activeItems.set(`event-${event.id}`, {
            id: `event-${event.id}`,
            type: 'event',
            title: event.title,
            time: event.event_time,
            date: event.event_date,
            userId: event.user_id
          });
        }
      });

      this.log(`📊 Loaded ${this.activeItems.size} items for notification monitoring`);
    } catch (error) {
      console.error('OSNotificationManager: Error loading items:', error);
    }
  }

  /**
   * Main notification processing logic
   */
  private async processNotifications(): Promise<void> {
    try {
      const currentTime = getCurrentTimeString();
      const today = getTodayDateString();
      this.lastCheckTime = currentTime;

      this.log(`🔍 Processing notifications at ${currentTime}`);

      for (const [itemId, item] of this.activeItems.entries()) {
        if (item.date !== today) continue;

        const minutesUntilDue = this.calculateMinutesUntilDue(item.time, currentTime);

        // 30-minute reminder
        if (this.shouldSend30MinReminder(item, minutesUntilDue)) {
          await this.send30MinuteReminder(item);
          item.notified30min = true;
        }

        // 15-minute reminder
        if (this.shouldSend15MinReminder(item, minutesUntilDue)) {
          await this.send15MinuteReminder(item);
          item.notified15min = true;
        }

        // Handle due time
        if (minutesUntilDue <= 0) {
          if (item.type === 'task') {
            await this.handleTaskOverdue(item);
          } else {
            await this.handleEventStart(item);
          }
          
          // Remove from active monitoring
          this.activeItems.delete(itemId);
        }
      }

    } catch (error) {
      console.error('OSNotificationManager: Error processing notifications:', error);
    }
  }

  /**
   * Calculate minutes until due time
   */
  private calculateMinutesUntilDue(targetTime: string, currentTime: string): number {
    const [targetHour, targetMin] = targetTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    
    const targetMinutes = targetHour * 60 + targetMin;
    const currentMinutes = currentHour * 60 + currentMin;
    
    return targetMinutes - currentMinutes;
  }

  /**
   * Check if 30-minute reminder should be sent
   */
  private shouldSend30MinReminder(item: NotificationItem, minutesUntilDue: number): boolean {
    if (item.notified30min) return false;
    
    if (item.type === 'task' && this.config.task30minReminder) {
      return minutesUntilDue <= 30 && minutesUntilDue > 15;
    }
    
    if (item.type === 'event' && this.config.event30minReminder) {
      return minutesUntilDue <= 30 && minutesUntilDue > 15;
    }
    
    return false;
  }

  /**
   * Check if 15-minute reminder should be sent
   */
  private shouldSend15MinReminder(item: NotificationItem, minutesUntilDue: number): boolean {
    if (item.notified15min) return false;
    
    if (item.type === 'task' && this.config.task15minReminder) {
      return minutesUntilDue <= 15 && minutesUntilDue > 0;
    }
    
    if (item.type === 'event' && this.config.event15minReminder) {
      return minutesUntilDue <= 15 && minutesUntilDue > 0;
    }
    
    return false;
  }

  /**
   * Send 30-minute reminder notification
   */
  private async send30MinuteReminder(item: NotificationItem): Promise<void> {
    try {
      const title = `⏰ ${item.type === 'task' ? 'Task' : 'Event'} Reminder`;
      const body = `"${item.title}" ${item.type === 'task' ? 'is due' : 'starts'} in 30 minutes at ${item.time}`;
      
      await systemNotificationService.showImmediate(title, body, item.type);
      this.log(`🔔 30min reminder sent: ${item.title}`);
    } catch (error) {
      console.error('OSNotificationManager: Error sending 30min reminder:', error);
    }
  }

  /**
   * Send 15-minute reminder notification
   */
  private async send15MinuteReminder(item: NotificationItem): Promise<void> {
    try {
      const title = `🚨 ${item.type === 'task' ? 'Task' : 'Event'} Alert`;
      const body = `"${item.title}" ${item.type === 'task' ? 'is due' : 'starts'} in 15 minutes at ${item.time}`;
      
      await systemNotificationService.showImmediate(title, body, item.type);
      this.log(`🚨 15min reminder sent: ${item.title}`);
    } catch (error) {
      console.error('OSNotificationManager: Error sending 15min reminder:', error);
    }
  }

  /**
   * Handle task becoming overdue
   */
  private async handleTaskOverdue(item: NotificationItem): Promise<void> {
    try {
      if (item.notifiedOverdue) return;

      // Send overdue notification
      const title = `❌ Task Overdue`;
      const body = `"${item.title}" was due at ${item.time} and has failed.`;
      
      await systemNotificationService.showImmediate(title, body, 'task');

      // Mark task as failed in database
      const taskId = parseInt(item.id.replace('task-', ''));
      await window.electronAPI.db.updateTask(taskId, { failed: true });

      // Dispatch events for UI updates
      window.dispatchEvent(new CustomEvent('task-failed', {
        detail: { taskId, title: item.title }
      }));

      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      window.dispatchEvent(new CustomEvent('notifications-refresh'));

      item.notifiedOverdue = true;
      this.log(`❌ Task failed: ${item.title}`);

    } catch (error) {
      console.error('OSNotificationManager: Error handling task overdue:', error);
    }
  }

  /**
   * Handle event starting
   */
  private async handleEventStart(item: NotificationItem): Promise<void> {
    try {
      if (item.notifiedStart) return;

      const title = `🎯 Event Starting`;
      const body = `"${item.title}" is starting now!`;
      
      await systemNotificationService.showImmediate(title, body, 'event');

      item.notifiedStart = true;
      this.log(`🎯 Event started: ${item.title}`);

    } catch (error) {
      console.error('OSNotificationManager: Error handling event start:', error);
    }
  }

  /**
   * Handle task completion
   */
  public async handleTaskCompletion(taskId: number, taskTitle: string): Promise<void> {
    try {
      // Remove from active monitoring
      this.activeItems.delete(`task-${taskId}`);

      // Send completion celebration
      await systemNotificationService.showTaskCompletion(taskTitle);

      this.log(`✅ Task completed: ${taskTitle}`);
    } catch (error) {
      console.error('OSNotificationManager: Error handling task completion:', error);
    }
  }

  /**
   * Set up event listeners for real-time updates
   */
  private setupEventListeners(): void {
    // Listen for task updates
    window.addEventListener('task-updated', this.handleTaskUpdate.bind(this));
    window.addEventListener('task-created', this.handleTaskCreated.bind(this));
    window.addEventListener('task-completed', this.handleTaskCompletedEvent.bind(this));
    window.addEventListener('task-deleted', this.handleTaskDeleted.bind(this));

    // Listen for event updates
    window.addEventListener('event-updated', this.handleEventUpdate.bind(this));
    window.addEventListener('event-created', this.handleEventCreated.bind(this));
    window.addEventListener('event-deleted', this.handleEventDeleted.bind(this));
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    window.removeEventListener('task-updated', this.handleTaskUpdate.bind(this));
    window.removeEventListener('task-created', this.handleTaskCreated.bind(this));
    window.removeEventListener('task-completed', this.handleTaskCompletedEvent.bind(this));
    window.removeEventListener('task-deleted', this.handleTaskDeleted.bind(this));
    window.removeEventListener('event-updated', this.handleEventUpdate.bind(this));
    window.removeEventListener('event-created', this.handleEventCreated.bind(this));
    window.removeEventListener('event-deleted', this.handleEventDeleted.bind(this));
  }

  /**
   * Handle task update events
   */
  private handleTaskUpdate(event: CustomEvent): void {
    const task = event.detail;
    const itemId = `task-${task.id}`;

    if (task.completed || task.failed) {
      this.activeItems.delete(itemId);
      if (task.completed) {
        this.handleTaskCompletion(task.id, task.title);
      }
    } else if (task.task_time) {
      this.activeItems.set(itemId, {
        id: itemId,
        type: 'task',
        title: task.title,
        time: task.task_time,
        date: task.task_date,
        userId: task.user_id,
        completed: task.completed,
        failed: task.failed
      });
    }
  }

  /**
   * Handle task creation events
   */
  private handleTaskCreated(event: CustomEvent): void {
    const task = event.detail;
    if (!task.completed && !task.failed && task.task_time) {
      this.activeItems.set(`task-${task.id}`, {
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        time: task.task_time,
        date: task.task_date,
        userId: task.user_id,
        completed: task.completed,
        failed: task.failed
      });
      this.log(`➕ Added task to monitoring: ${task.title}`);
    }
  }

  /**
   * Handle task completion events
   */
  private handleTaskCompletedEvent(event: CustomEvent): void {
    const { taskId, title } = event.detail;
    this.handleTaskCompletion(taskId, title);
  }

  /**
   * Handle task deletion events
   */
  private handleTaskDeleted(event: CustomEvent): void {
    const taskId = event.detail.taskId;
    this.activeItems.delete(`task-${taskId}`);
    this.log(`➖ Removed task from monitoring: ${taskId}`);
  }

  /**
   * Handle event update events
   */
  private handleEventUpdate(event: CustomEvent): void {
    const eventData = event.detail;
    const itemId = `event-${eventData.id}`;

    if (eventData.event_time) {
      this.activeItems.set(itemId, {
        id: itemId,
        type: 'event',
        title: eventData.title,
        time: eventData.event_time,
        date: eventData.event_date,
        userId: eventData.user_id
      });
    } else {
      this.activeItems.delete(itemId);
    }
  }

  /**
   * Handle event creation events
   */
  private handleEventCreated(event: CustomEvent): void {
    const eventData = event.detail;
    if (eventData.event_time) {
      this.activeItems.set(`event-${eventData.id}`, {
        id: `event-${eventData.id}`,
        type: 'event',
        title: eventData.title,
        time: eventData.event_time,
        date: eventData.event_date,
        userId: eventData.user_id
      });
      this.log(`➕ Added event to monitoring: ${eventData.title}`);
    }
  }

  /**
   * Handle event deletion events
   */
  private handleEventDeleted(event: CustomEvent): void {
    const eventId = event.detail.eventId;
    this.activeItems.delete(`event-${eventId}`);
    this.log(`➖ Removed event from monitoring: ${eventId}`);
  }

  /**
   * Get current status
   */
  public getStatus(): {
    isRunning: boolean;
    activeItems: number;
    lastCheckTime: string;
  } {
    return {
      isRunning: this.isRunning,
      activeItems: this.activeItems.size,
      lastCheckTime: this.lastCheckTime
    };
  }

  /**
   * Force refresh of active items
   */
  public async forceRefresh(): Promise<void> {
    this.log('🔄 Force refreshing active items');
    await this.loadActiveItems();
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[OSNotificationManager] ${message}`, ...args);
    }
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    this.stop();
    OSNotificationManager.instance = null;
    this.log('🗑️ OSNotificationManager destroyed');
  }
}

export const osNotificationManager = OSNotificationManager.getInstance();
export default OSNotificationManager;