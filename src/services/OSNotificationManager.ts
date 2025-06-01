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
  notified5min?: boolean;
  notifiedOverdue?: boolean;
  notifiedStart?: boolean;
  completed?: boolean;
  failed?: boolean;
}

interface OSNotificationConfig {
  checkIntervalMs: number;
  task30minReminder: boolean;
  task5minReminder: boolean;
  event30minReminder: boolean;
  event5minReminder: boolean;
  enableLogging: boolean;
}

class OSNotificationManager {
  private static instance: OSNotificationManager | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: OSNotificationConfig;
  private eventHandlers: { [key: string]: EventListener } = {};
  
  // Track all active notifications
  private activeItems: Map<string, NotificationItem> = new Map();
  private lastCheckTime: string = '';
  private isInitialLoad: boolean = true;
    // Enhanced cleanup and concurrency management
  private isDestroyed: boolean = false;
  private cleanupCallbacks: Array<() => void> = [];
  private updateLock: boolean = false; // Prevent concurrent updates
  private notificationStateCache: Map<string, {notified30min?: boolean, notified5min?: boolean}> = new Map();

  private constructor(config: Partial<OSNotificationConfig> = {}) {
    this.config = {
      checkIntervalMs: 60 * 1000, // Check every minute
      task30minReminder: true,
      task5minReminder: true,
      event30minReminder: true,
      event5minReminder: true,
      enableLogging: true,
      ...config
    };
    
    // Register cleanup on window unload
    this.registerCleanupHandlers();
  }

  public static getInstance(config?: Partial<OSNotificationConfig>): OSNotificationManager {
    if (!OSNotificationManager.instance) {
      OSNotificationManager.instance = new OSNotificationManager(config);
    }
    return OSNotificationManager.instance;
  }
  /**
   * Start the notification manager with improved initial load handling
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log('⚠️ OSNotificationManager: Already running');
      return;
    }

    this.log('🚀 OSNotificationManager: Starting notification system');
    
    // Request notification permissions
    await this.requestPermissions();
    
    // Set initial load flag
    this.isInitialLoad = true;
    
    // Load all current items
    await this.loadActiveItems();
    
    // Start monitoring
    this.isRunning = true;
    
    // Clear initial load flag after a shorter delay (15 seconds instead of 60)
    setTimeout(() => {
      this.isInitialLoad = false;
      this.log('🔓 Initial load period ended - notifications now active');
      
      // Run an immediate check for any urgent items (due within 5 minutes)
      this.checkUrgentNotifications();
    }, 15000); // 15 seconds instead of full interval
    
    // Set up interval to check every minute
    this.intervalId = setInterval(() => {
      this.processNotifications();
    }, this.config.checkIntervalMs);

    // Set up event listeners for real-time updates
    this.setupEventListeners();

    this.log('✅ OSNotificationManager: Started successfully (15-second initial delay)');
  }
  /**
   * Stop the notification manager with enhanced cleanup
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
    this.removeEventListeners();
    
    // COMPLETED: Enhanced cleanup without destroying singleton
    this.activeItems.clear();
    this.lastCheckTime = '';
    this.isInitialLoad = true;
    
    this.log('⏹️ OSNotificationManager: Stopped with enhanced cleanup');
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
   * Load only FUTURE tasks and events that need monitoring with enhanced error handling
   * NEVER load already overdue items for notification
   */
  private async loadActiveItems(): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        this.log('⚠️ No user ID available - skipping item load');
        return;
      }

      const today = getTodayDateString();
      const currentTime = getCurrentTimeString();
      
      this.log(`📊 Loading active items for user ${userId} on ${today} at ${currentTime}`);
      
      // Get today's tasks and events with enhanced error handling
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today).catch(error => {
          console.error('❌ Error loading tasks:', error);
          return [];
        }),
        window.electronAPI.db.getEvents(userId, today).catch(error => {
          console.error('❌ Error loading events:', error);
          return [];
        })
      ]);

      this.activeItems.clear();
      let futureTaskCount = 0;
      let futureEventCount = 0;        // Process tasks with detailed logging
        if (Array.isArray(tasks)) {
          tasks.forEach(task => {
            if (!task.completed && !task.failed && task.task_time && task.task_time !== 'All day') {
              if (task.task_time > currentTime) {
                const itemKey = `task-${task.id}`;
                const cachedState = this.getNotificationState(itemKey);
                
                this.activeItems.set(itemKey, {
                  id: itemKey,
                  type: 'task',
                  title: task.title,
                  time: task.task_time,
                  date: task.task_date,
                  userId: task.user_id,
                  completed: task.completed,
                  failed: task.failed,
                  // Restore notification state from cache
                  notified30min: cachedState.notified30min || false,
                  notified5min: cachedState.notified5min || false
                });
                futureTaskCount++;
                this.log(`➕ Added FUTURE task: ${task.title} at ${task.task_time}`);
              } else {
                this.log(`⏭️ Skipped OVERDUE task: ${task.title} (${task.task_time} < ${currentTime})`);
              }
            }
          });
        } else {
          this.log('⚠️ Tasks data is not an array:', tasks);
        }

      // Process events with detailed logging
      if (Array.isArray(events)) {
        events.forEach(event => {
          if (event.event_time && event.event_time !== 'All day') {
            if (event.event_time > currentTime) {
              this.activeItems.set(`event-${event.id}`, {
                id: `event-${event.id}`,
                type: 'event',
                title: event.title,
                time: event.event_time,
                date: event.event_date,
                userId: event.user_id
              });
              futureEventCount++;
              this.log(`➕ Added FUTURE event: ${event.title} at ${event.event_time}`);
            } else {
              this.log(`⏭️ Skipped PAST event: ${event.title} (${event.event_time} < ${currentTime})`);
            }
          }
        });
      } else {
        this.log('⚠️ Events data is not an array:', events);
      }

      this.log(`📊 Loaded ${futureTaskCount} tasks and ${futureEventCount} events for monitoring (total: ${this.activeItems.size})`);
      
    } catch (error) {
      console.error('❌ OSNotificationManager: Critical error loading items:', error);
      // Don't let loading errors stop the notification service
      this.activeItems.clear();
    }
  }/**
   * Check for urgent notifications after initial load period
   */
  private async checkUrgentNotifications(): Promise<void> {
    try {
      const currentTime = getCurrentTimeString();
      const today = getTodayDateString();
      
      this.log('🚨 Checking for urgent notifications after initial load');
      
      for (const [itemId, item] of this.activeItems.entries()) {
        if (item.date !== today) continue;
        
        const minutesUntilDue = this.calculateMinutesUntilDue(item.time, currentTime);
        
        // Only send notifications for items due within 5 minutes
        if (minutesUntilDue <= 5 && minutesUntilDue > 0 && !item.notified5min) {
          await this.send5MinuteReminder(item);
          item.notified5min = true;
          this.log(`🚨 Urgent notification sent for: ${item.title}`);
        }
        
        // Handle items that are already overdue
        if (minutesUntilDue <= 0 && !item.notifiedOverdue && !item.notifiedStart) {
          if (item.type === 'task') {
            await this.handleTaskOverdue(item);
            item.notifiedOverdue = true;
          } else {
            await this.handleEventStart(item);
            item.notifiedStart = true;
          }
          
          this.activeItems.delete(itemId);
          this.log(`🚨 Immediate notification sent for overdue item: ${item.title}`);
        }
      }
    } catch (error) {
      console.error('OSNotificationManager: Error in urgent notification check:', error);
    }
  }

  /**
   * Clean up expired items that are no longer relevant
   */
  private cleanupExpiredItems(currentTime: string, today: string): void {
    const itemsToRemove: string[] = [];
    
    for (const [itemId, item] of this.activeItems.entries()) {
      // Remove items from different dates
      if (item.date !== today) {
        itemsToRemove.push(itemId);
        continue;
      }
      
      // Remove items that are more than 2 hours overdue to prevent memory buildup
      const minutesUntilDue = this.calculateMinutesUntilDue(item.time, currentTime);
      if (minutesUntilDue < -120) { // More than 2 hours overdue
        itemsToRemove.push(itemId);
        this.log(`🧹 Cleaning up expired item: ${item.title} (${Math.abs(minutesUntilDue)} minutes overdue)`);
      }
    }
    
    // Remove expired items
    itemsToRemove.forEach(itemId => {
      this.activeItems.delete(itemId);
    });
    
    if (itemsToRemove.length > 0) {
      this.log(`🧹 Cleaned up ${itemsToRemove.length} expired items`);
    }
  }

  /**
   *   Enhanced notification processing with better timing and state management
   * NOT for items that were already overdue when we started
   */
 private async processNotifications(): Promise<void> {
  try {
    if (this.isInitialLoad) {
      this.log('🔕 OSNotificationManager: Skipping notifications during initial load');
      return;
    }

    const currentTime = getCurrentTimeString();
    const today = getTodayDateString();
    this.lastCheckTime = currentTime;

    this.log(`🔍 Processing notifications at ${currentTime} (${this.activeItems.size} items)`);

    // Clean up expired items first
    this.cleanupExpiredItems(currentTime, today);

    for (const [itemId, item] of this.activeItems.entries()) {
      if (item.date !== today) {
        this.log(`📅 Skipping item from different date: ${item.title} (${item.date})`);
        continue;
      }

      const minutesUntilDue = this.calculateMinutesUntilDue(item.time, currentTime);
      
      // Skip invalid time calculations
      if (minutesUntilDue === -1) {
        this.log(`⚠️ Skipping item with invalid time: ${item.title}`);
        continue;
      }

      this.log(`⏰ ${item.title}: ${minutesUntilDue} minutes until due`);      // 30-minute reminder
      if (this.shouldSend30MinReminder(item, minutesUntilDue)) {
        await this.send30MinuteReminder(item);
        item.notified30min = true;
        this.updateNotificationState(itemId, { notified30min: true });
        this.log(`✅ 30min reminder sent for: ${item.title}`);
      }

      // 5-minute reminder
      if (this.shouldSend5MinReminder(item, minutesUntilDue)) {
        await this.send5MinuteReminder(item);
        item.notified5min = true;
        this.updateNotificationState(itemId, { notified5min: true });
        this.log(`✅ 5min reminder sent for: ${item.title}`);
      }

      // Handle due time (ONLY when timer reaches 0 or becomes negative)
      if (minutesUntilDue <= 0 && !item.notifiedOverdue && !item.notifiedStart) {
        if (item.type === 'task') {
          await this.handleTaskOverdue(item);
          item.notifiedOverdue = true;
        } else {
          await this.handleEventStart(item);
          item.notifiedStart = true;
        }
        
        // Remove from monitoring and clear cache AFTER notification is sent
        this.activeItems.delete(itemId);
        this.clearNotificationState(itemId);
        this.log(`🗑️ Removed completed notification item: ${item.title}`);
      }
    }

    this.log(`📊 Notification processing complete. Monitoring ${this.activeItems.size} items.`);

  } catch (error) {
    console.error('OSNotificationManager: Error processing notifications:', error);
  }
}/**
   * Calculate minutes until due time with enhanced date/time handling
   */
  private calculateMinutesUntilDue(targetTime: string, currentTime: string): number {
    try {
      const [targetHour, targetMin] = targetTime.split(':').map(Number);
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      
      // Validate time format
      if (isNaN(targetHour) || isNaN(targetMin) || isNaN(currentHour) || isNaN(currentMin)) {
        this.log(`⚠️ Invalid time format - target: ${targetTime}, current: ${currentTime}`);
        return -1; // Invalid time
      }
      
      const targetMinutes = targetHour * 60 + targetMin;
      const currentMinutes = currentHour * 60 + currentMin;
      
      let diff = targetMinutes - currentMinutes;
      
      // Handle day boundary crossing (e.g., 23:59 → 00:30)
      if (diff < -720) { // More than 12 hours in the past suggests next day
        diff += 1440; // Add 24 hours in minutes
        this.log(`Day boundary detected - adjusted diff: ${diff} minutes`);
      }
      
      return diff;
    } catch (error) {
      this.log(`Error calculating time difference: ${error}`);
      return -1;
    }
  }

  /**
   * Check if 30-minute reminder should be sent
   */
  private shouldSend30MinReminder(item: NotificationItem, minutesUntilDue: number): boolean {
    if (item.notified30min) return false;
    
    if (item.type === 'task' && this.config.task30minReminder) {
      return minutesUntilDue <= 30 && minutesUntilDue > 5;
    }
    
    if (item.type === 'event' && this.config.event30minReminder) {
      return minutesUntilDue <= 30 && minutesUntilDue > 5;
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
 * Check if 5-minute reminder should be sent (CHANGED from 15min)
 */
private shouldSend5MinReminder(item: NotificationItem, minutesUntilDue: number): boolean {
  if (item.notified5min) return false;
  
  if (item.type === 'task' && this.config.task5minReminder) {
    return minutesUntilDue <= 5 && minutesUntilDue > 0;
  }
  
  if (item.type === 'event' && this.config.event5minReminder) {
    return minutesUntilDue <= 5 && minutesUntilDue > 0;
  }
  
  return false;
}

/**
 * Send 5-minute reminder notification (CHANGED from 15min)
 */
private async send5MinuteReminder(item: NotificationItem): Promise<void> {
  try {
    const title = `🚨 ${item.type === 'task' ? 'Task' : 'Event'} Alert`;
    const body = `"${item.title}" ${item.type === 'task' ? 'is due' : 'starts'} in 5 minutes at ${item.time}`;
    
    await systemNotificationService.showImmediate(title, body, item.type);
    this.log(`🚨 5min reminder sent: ${item.title}`);
  } catch (error) {
    console.error('OSNotificationManager: Error sending 5min reminder:', error);
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
  // Create strongly typed event handlers to avoid type casting issues
  const taskUpdateHandler = (event: Event) => {
    this.handleTaskUpdate(event as CustomEvent).catch(console.error);
  };
  const taskCreatedHandler = (event: Event) => this.handleTaskCreated(event as CustomEvent);
  const taskCompletedHandler = (event: Event) => this.handleTaskCompletedEvent(event as CustomEvent);
  const taskDeletedHandler = (event: Event) => this.handleTaskDeleted(event as CustomEvent);
  const eventUpdateHandler = (event: Event) => this.handleEventUpdate(event as CustomEvent);
  const eventCreatedHandler = (event: Event) => this.handleEventCreated(event as CustomEvent);
  const eventDeletedHandler = (event: Event) => this.handleEventDeleted(event as CustomEvent);
  const retryRefreshHandler = () => this.handleRetryRefresh();

  // Add event listeners with proper typing
  window.addEventListener('task-updated', taskUpdateHandler);
  window.addEventListener('task-created', taskCreatedHandler);
  window.addEventListener('task-completed', taskCompletedHandler);
  window.addEventListener('task-deleted', taskDeletedHandler);
  window.addEventListener('event-updated', eventUpdateHandler);
  window.addEventListener('event-created', eventCreatedHandler);
  window.addEventListener('event-deleted', eventDeletedHandler);
  window.addEventListener('retry-mission-refresh', retryRefreshHandler);

  // Store handlers for cleanup
  this.eventHandlers = {
    'task-updated': taskUpdateHandler,
    'task-created': taskCreatedHandler,
    'task-completed': taskCompletedHandler,
    'task-deleted': taskDeletedHandler,
    'event-updated': eventUpdateHandler,
    'event-created': eventCreatedHandler,
    'event-deleted': eventDeletedHandler,
    'retry-mission-refresh': retryRefreshHandler
  };
}

/**
 * Remove event listeners with proper cleanup
 */
private removeEventListeners(): void {
  if (this.eventHandlers) {
    window.removeEventListener('task-updated', this.eventHandlers['task-updated']);
    window.removeEventListener('task-created', this.eventHandlers['task-created']);
    window.removeEventListener('task-completed', this.eventHandlers['task-completed']);
    window.removeEventListener('task-deleted', this.eventHandlers['task-deleted']);
    window.removeEventListener('event-updated', this.eventHandlers['event-updated']);
    window.removeEventListener('event-created', this.eventHandlers['event-created']);
    window.removeEventListener('event-deleted', this.eventHandlers['event-deleted']);
    window.removeEventListener('retry-mission-refresh', this.eventHandlers['retry-mission-refresh']);
  }
}

/**
 * Handle event deletion events - FIX: Add missing method
 */
private handleEventDeleted(event: Event): void {
  const customEvent = event as CustomEvent;
  const eventId = customEvent.detail.eventId;
  this.activeItems.delete(`event-${eventId}`);
  this.log(`➖ Removed event from monitoring: ${eventId}`);
}

/**
 * Handle retry mission refresh events
 */
private handleRetryRefresh(): void {
  this.log('🔄 Retry mission refresh triggered - reloading active items');
  this.loadActiveItems();
}
  /**
   * Handle task update events with concurrency protection
   */
  private async handleTaskUpdate(event: CustomEvent): Promise<void> {
    await this.safeUpdateActiveItems(async () => {
      const task = event.detail;
      const itemId = `task-${task.id}`;
      const currentTime = getCurrentTimeString();

      if (task.completed || task.failed) {
        // Send failure notification BEFORE removing from monitoring
        if (task.failed && !task.completed) {
          const title = `❌ Task Failed`;
          const body = `"${task.title}" was due at ${task.task_time} and has failed.`;
          
          try {
            await systemNotificationService.showImmediate(title, body, 'task');
            this.log(`❌ Task failure notification sent: ${task.title}`);
          } catch (error) {
            console.error('Error sending failure notification:', error);
          }
        }
        
        // Task completed or failed - remove from monitoring
        this.activeItems.delete(itemId);
        if (task.completed) {
          await this.handleTaskCompletion(task.id, task.title);
        }
        this.log(`➖ Removed task from monitoring (completed/failed): ${task.title}`);
      } else if (task.task_time && task.task_time !== 'All day') {
        // Only add if task time is in the future
        if (task.task_time > currentTime) {
          const updatedItem: NotificationItem = {
            id: itemId,
            type: 'task',
            title: task.title,
            time: task.task_time,
            date: task.task_date,
            userId: task.user_id,
            completed: task.completed,
            failed: task.failed,
            // Reset notification flags for retried tasks
            notified30min: false,
            notified5min: false,
            notifiedOverdue: false
          };

          this.activeItems.set(itemId, updatedItem);
          this.log(`🔄 Updated task monitoring: ${task.title} (future time: ${task.task_time})`);
        } else {
          // Remove overdue tasks from monitoring
          this.activeItems.delete(itemId);
          this.log(`⏭️ Removed OVERDUE task from monitoring: ${task.title} (${task.task_time} < ${currentTime})`);
        }
      } else {
        // Task has no time or is all-day - remove from time-based monitoring
        this.activeItems.delete(itemId);
        this.log(`➖ Removed task from monitoring (no time): ${task.title}`);
      }
    });
  }
  /**
   * Handle task creation events with concurrency protection
   */
  private handleTaskCreated(event: CustomEvent): void {
    this.safeUpdateActiveItems(() => {
      const task = event.detail;
      const currentTime = getCurrentTimeString();
      
      if (!task.completed && !task.failed && task.task_time && task.task_time !== 'All day') {
        // Only add if task time is in the future
        if (task.task_time > currentTime) {
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
          this.log(`➕ Added FUTURE task to monitoring: ${task.title} at ${task.task_time}`);
        } else {
          this.log(`⏭️ Skipped OVERDUE task creation: ${task.title} (${task.task_time} < ${currentTime})`);
        }
      }
    });
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
   * Handle event update events with concurrency protection
   */
  private handleEventUpdate(event: CustomEvent): void {
    this.safeUpdateActiveItems(() => {
      const eventData = event.detail;
      const itemId = `event-${eventData.id}`;
      const currentTime = getCurrentTimeString();

      if (eventData.event_time && eventData.event_time !== 'All day') {
        // Only add if event time is in the future
        if (eventData.event_time > currentTime) {
          this.activeItems.set(itemId, {
            id: itemId,
            type: 'event',
            title: eventData.title,
            time: eventData.event_time,
            date: eventData.event_date,
            userId: eventData.user_id
          });
          this.log(`🔄 Updated FUTURE event monitoring: ${eventData.title} at ${eventData.event_time}`);
        } else {
          this.activeItems.delete(itemId);
          this.log(`⏭️ Removed PAST event from monitoring: ${eventData.title} (${eventData.event_time} < ${currentTime})`);
        }
      } else {
        this.activeItems.delete(itemId);
        this.log(`➖ Removed event from monitoring (no time): ${eventData.title}`);
      }
    });
  }

  /**
   * Handle event creation events
   */
  private handleEventCreated(event: CustomEvent): void {
    const eventData = event.detail;
    const currentTime = getCurrentTimeString();
    
    if (eventData.event_time && eventData.event_time !== 'All day') {
      // Only add if event time is in the future
      if (eventData.event_time > currentTime) {
        this.activeItems.set(`event-${eventData.id}`, {
          id: `event-${eventData.id}`,
          type: 'event',
          title: eventData.title,
          time: eventData.event_time,
          date: eventData.event_date,
          userId: eventData.user_id
        });
        this.log(`➕ Added FUTURE event to monitoring: ${eventData.title} at ${eventData.event_time}`);
      } else {
        this.log(`⏭️ Skipped PAST event creation: ${eventData.title} (${eventData.event_time} < ${currentTime})`);
      }
    }
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
  }  /**
   * Get notification state for an item from cache
   */
  private getNotificationState(itemId: string): {notified30min?: boolean, notified5min?: boolean} {
    return this.notificationStateCache.get(itemId) || {};
  }

  /**
   * Update notification state in cache
   */
  private updateNotificationState(itemId: string, state: {notified30min?: boolean, notified5min?: boolean}): void {
    const existing = this.notificationStateCache.get(itemId) || {};
    this.notificationStateCache.set(itemId, { ...existing, ...state });
  }

  /**
   * Clear notification state for an item
   */
  private clearNotificationState(itemId: string): void {
    this.notificationStateCache.delete(itemId);
  }

  /**
   * Safely update active items with concurrency protection
   */
  private async safeUpdateActiveItems(updateFn: () => Promise<void> | void): Promise<void> {
    if (this.updateLock) {
      this.log('🔒 Update already in progress - skipping concurrent update');
      return;
    }
    
    this.updateLock = true;
    try {
      await updateFn();
    } catch (error) {
      console.error('❌ Error during safe update:', error);
    } finally {
      this.updateLock = false;
    }
  }

  /**
   * Force refresh of active items with concurrency protection
   */
  public async forceRefresh(): Promise<void> {
    await this.safeUpdateActiveItems(async () => {
      this.log('🔄 Force refreshing active items');
      await this.loadActiveItems();
    });
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
   * Register cleanup handlers to prevent memory leaks
   */
  private registerCleanupHandlers(): void {
    // Handle window unload
    const handleUnload = () => {
      this.destroy();
    };
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.log('🔧 Page hidden - pausing notifications');
      } else {
        this.log('🔧 Page visible - resuming notifications');
      }
    };
    
    // Register event listeners
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Store cleanup callbacks
    this.cleanupCallbacks.push(() => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  // Destroy instance and cleanup all resources
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.log('🔧 OSNotificationManager: Destroying instance and cleaning up');
    
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
    
    // Clear arrays and maps
    this.cleanupCallbacks = [];
    this.activeItems.clear();
    this.eventHandlers = {};
    
    // Mark as destroyed
    this.isDestroyed = true;
    
    // Clear singleton instance
    OSNotificationManager.instance = null;
  }
}

export const osNotificationManager = OSNotificationManager.getInstance();
export default OSNotificationManager;

