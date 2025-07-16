/**
 *  In-Memory Notification Scheduler
 *
 * Based on Discord architecture patterns:
 * - Loads data once at startup
 * - Maintains in-memory state with calculated timers
 * - Updates via real-time DataContext events
 * - Database used only for persistence, never polling
 *
 */

import { getTodayDateString, getCurrentTimeString } from "../utils/timeUtils";

export interface ScheduledNotification {
  id: string;
  type: "task" | "event";
  title: string;
  targetTime: string; // HH:MM format
  date: string; // YYYY-MM-DD format
  userId: string;

  // Notification stages
  reminder30min?: boolean;
  reminder5min?: boolean;
  finalNotification?: boolean;

  // Original item data for reference
  originalId: number;
  completed?: boolean;
  failed?: boolean;
}

export interface NotificationEvent {
  id: string;
  type: "reminder30min" | "reminder5min" | "task_overdue" | "event_start";
  notification: ScheduledNotification;
  triggerTime: Date;
}

class NotificationScheduler {
  private static instance: NotificationScheduler | null = null;

  // In-memory state management
  private notifications: Map<string, ScheduledNotification> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private eventHandlers: Map<string, (event: NotificationEvent) => void> =
    new Map();

  // Configuration
  private config = {
    enable30minReminders: true,
    enable5minReminders: true,
    enableTaskFailure: true,
    enableEventStart: true,
    enableLogging: true,
  };

  private isInitialized = false;
  private currentUserId: string | null = null;

  private constructor() {
    this.setupCleanupHandlers();
  }

  public static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  /**
   * Initialize scheduler with user data (called once at startup)
   */
  public async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      this.log("Already initialized for this user");
      return;
    }

    this.log(`Initializing notification scheduler for user ${userId}`);

    // Clean up any existing state
    this.cleanup();

    this.currentUserId = userId;

    try {
      // Load all notification items from database once
      const items = await this.loadNotificationItems(userId);

      // Schedule all items in memory
      this.scheduleAllItems(items);

      this.isInitialized = true;
      this.log(`Scheduler initialized with ${items.length} items`);
    } catch (error) {
      console.error("Failed to initialize notification scheduler:", error);
      throw error;
    }
  }
  /**
   * Proper time comparison utility (fixes string comparison bug)
   */
  private isTimeInFuture(targetTime: string, currentTime: string): boolean {
    const parseTimeToMinutes = (timeString: string): number => {
      const [hours, minutes] = timeString.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const targetMinutes = parseTimeToMinutes(targetTime);
    const currentMinutes = parseTimeToMinutes(currentTime);

    return targetMinutes > currentMinutes;
  }

  /**
   * Load notification items from database (one-time operation)
   */
  private async loadNotificationItems(
    userId: string,
  ): Promise<ScheduledNotification[]> {
    const today = getTodayDateString();

    try {
      // Load tasks and events for today
      const [tasks, events] = await Promise.all([
        window.electronAPI?.db?.getTasks(userId, today) || [],
        window.electronAPI?.db?.getEvents(userId, today) || [],
      ]);

      const notifications: ScheduledNotification[] = [];
      const currentTime = getCurrentTimeString(); // Process tasks
      if (Array.isArray(tasks)) {
        tasks.forEach((task) => {
          if (
            !task.completed &&
            !task.failed &&
            task.task_time &&
            task.task_time !== "All day"
          ) {
            // Only schedule future tasks
            if (this.isTimeInFuture(task.task_time, currentTime)) {
              notifications.push({
                id: `task-${task.id}`,
                type: "task",
                title: task.title,
                targetTime: task.task_time,
                date: today,
                userId: userId,
                originalId: task.id,
                completed: false,
                failed: false,
              });
            }
          }
        });
      } // Process events
      if (Array.isArray(events)) {
        events.forEach((event) => {
          if (event.event_time && event.event_time !== "All day") {
            // Only schedule future events
            if (this.isTimeInFuture(event.event_time, currentTime)) {
              notifications.push({
                id: `event-${event.id}`,
                type: "event",
                title: event.title,
                targetTime: event.event_time,
                date: today,
                userId: userId,
                originalId: event.id,
              });
            }
          }
        });
      }
      this.log(
        ` Loaded ${notifications.length} future notification items from ${tasks.length} tasks, ${events.length} events (current time: ${currentTime})`,
      );
      return notifications;
    } catch (error) {
      console.error("Error loading notification items:", error);
      return [];
    }
  }

  /**
   * Schedule all items with calculated timers
   */
  private scheduleAllItems(items: ScheduledNotification[]): void {
    items.forEach((item) => {
      this.notifications.set(item.id, item);
      this.scheduleNotificationTimers(item);
    });

    this.log(`Scheduled ${items.length} notifications with timers`);
  }

  /**
   * Schedule timers for a single notification item
   */
  private scheduleNotificationTimers(
    notification: ScheduledNotification,
  ): void {
    const targetTime = this.parseTimeString(notification.targetTime);
    const now = new Date();

    // Calculate reminder times
    const reminder30min = new Date(targetTime.getTime() - 30 * 60 * 1000);
    const reminder5min = new Date(targetTime.getTime() - 5 * 60 * 1000);

    // Schedule 30-minute reminder
    if (
      this.config.enable30minReminders &&
      reminder30min > now &&
      !notification.reminder30min
    ) {
      const timerId = `${notification.id}-30min`;
      const timer = setTimeout(() => {
        this.triggerNotificationEvent({
          id: timerId,
          type: "reminder30min",
          notification,
          triggerTime: reminder30min,
        });
      }, reminder30min.getTime() - now.getTime());

      this.timers.set(timerId, timer);
      this.log(
        `Scheduled 30min reminder for ${
          notification.title
        } at ${reminder30min.toLocaleTimeString()}`,
      );
    }

    // Schedule 5-minute reminder
    if (
      this.config.enable5minReminders &&
      reminder5min > now &&
      !notification.reminder5min
    ) {
      const timerId = `${notification.id}-5min`;
      const timer = setTimeout(() => {
        this.triggerNotificationEvent({
          id: timerId,
          type: "reminder5min",
          notification,
          triggerTime: reminder5min,
        });
      }, reminder5min.getTime() - now.getTime());

      this.timers.set(timerId, timer);
      this.log(
        `Scheduled 5min reminder for ${
          notification.title
        } at ${reminder5min.toLocaleTimeString()}`,
      );
    }

    // Schedule final notification (task overdue / event start)
    if (targetTime > now) {
      const finalType =
        notification.type === "task" ? "task_overdue" : "event_start";
      const timerId = `${notification.id}-final`;
      const timer = setTimeout(() => {
        this.triggerNotificationEvent({
          id: timerId,
          type: finalType,
          notification,
          triggerTime: targetTime,
        });
      }, targetTime.getTime() - now.getTime());

      this.timers.set(timerId, timer);
      this.log(
        `Scheduled final notification for ${
          notification.title
        } at ${targetTime.toLocaleTimeString()}`,
      );
    }
  }

  /**
   * Trigger a notification event
   */
  private triggerNotificationEvent(event: NotificationEvent): void {
    this.log(`Triggering ${event.type} for ${event.notification.title}`);

    // Update notification state
    const notification = this.notifications.get(event.notification.id);
    if (notification) {
      switch (event.type) {
        case "reminder30min":
          notification.reminder30min = true;
          break;
        case "reminder5min":
          notification.reminder5min = true;
          break;
        case "task_overdue":
        case "event_start":
          notification.finalNotification = true;
          break;
      }
    }

    // Notify registered handlers
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("Error in notification event handler:", error);
      }
    });

    // Clean up timer
    this.timers.delete(event.id);

    // Remove from active notifications if final notification
    if (event.type === "task_overdue" || event.type === "event_start") {
      this.notifications.delete(event.notification.id);
      this.log(`Removed completed notification: ${event.notification.title}`);
    }
  }

  /**
   * Real-time update methods (called by DataContext events)
   */

  public onTaskCreated(task: any): void {
    if (!this.isInitialized || !task.task_time || task.task_time === "All day")
      return;
    const currentTime = getCurrentTimeString();
    if (!this.isTimeInFuture(task.task_time, currentTime)) return; // Skip past tasks

    const notification: ScheduledNotification = {
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      targetTime: task.task_time,
      date: task.task_date,
      userId: task.user_id,
      originalId: task.id,
      completed: false,
      failed: false,
    };

    this.notifications.set(notification.id, notification);
    this.scheduleNotificationTimers(notification);
    this.log(`Added new task notification: ${task.title}`);
  }

  public onTaskUpdated(task: any): void {
    if (!this.isInitialized) return;

    const notificationId = `task-${task.id}`;

    // Cancel existing timers
    this.cancelNotificationTimers(notificationId);

    if (
      task.completed ||
      task.failed ||
      !task.task_time ||
      task.task_time === "All day"
    ) {
      // Remove from notifications
      this.notifications.delete(notificationId);
      this.log(`Removed task notification: ${task.title} (completed/failed)`);
    } else {
      // Update and reschedule
      const currentTime = getCurrentTimeString();
      if (this.isTimeInFuture(task.task_time, currentTime)) {
        const notification: ScheduledNotification = {
          id: notificationId,
          type: "task",
          title: task.title,
          targetTime: task.task_time,
          date: task.task_date,
          userId: task.user_id,
          originalId: task.id,
          completed: false,
          failed: false,
        };

        this.notifications.set(notification.id, notification);
        this.scheduleNotificationTimers(notification);
        this.log(`Updated task notification: ${task.title}`);
      } else {
        this.notifications.delete(notificationId);
        this.log(`Removed past task notification: ${task.title}`);
      }
    }
  }

  public onTaskDeleted(taskId: number): void {
    if (!this.isInitialized) return;

    const notificationId = `task-${taskId}`;
    this.cancelNotificationTimers(notificationId);
    this.notifications.delete(notificationId);
    this.log(`Deleted task notification: ${taskId}`);
  }

  public onEventCreated(event: any): void {
    if (
      !this.isInitialized ||
      !event.event_time ||
      event.event_time === "All day"
    )
      return;
    const currentTime = getCurrentTimeString();
    if (!this.isTimeInFuture(event.event_time, currentTime)) return;

    const notification: ScheduledNotification = {
      id: `event-${event.id}`,
      type: "event",
      title: event.title,
      targetTime: event.event_time,
      date: event.event_date,
      userId: event.user_id,
      originalId: event.id,
    };

    this.notifications.set(notification.id, notification);
    this.scheduleNotificationTimers(notification);
    this.log(`Added new event notification: ${event.title}`);
  }

  public onEventUpdated(event: any): void {
    if (!this.isInitialized) return;

    const notificationId = `event-${event.id}`;

    // Cancel existing timers
    this.cancelNotificationTimers(notificationId);

    if (!event.event_time || event.event_time === "All day") {
      // Remove from notifications
      this.notifications.delete(notificationId);
      this.log(`Removed event notification: ${event.title} (no time)`);
    } else {
      // Update and reschedule
      const currentTime = getCurrentTimeString();
      if (this.isTimeInFuture(event.event_time, currentTime)) {
        const notification: ScheduledNotification = {
          id: notificationId,
          type: "event",
          title: event.title,
          targetTime: event.event_time,
          date: event.event_date,
          userId: event.user_id,
          originalId: event.id,
        };

        this.notifications.set(notification.id, notification);
        this.scheduleNotificationTimers(notification);
        this.log(`Updated event notification: ${event.title}`);
      } else {
        this.notifications.delete(notificationId);
        this.log(`Removed past event notification: ${event.title}`);
      }
    }
  }

  public onEventDeleted(eventId: number): void {
    if (!this.isInitialized) return;

    const notificationId = `event-${eventId}`;
    this.cancelNotificationTimers(notificationId);
    this.notifications.delete(notificationId);
    this.log(`Deleted event notification: ${eventId}`);
  }

  /**
   * Cancel all timers for a notification
   */
  private cancelNotificationTimers(notificationId: string): void {
    const timerIds = [
      `${notificationId}-30min`,
      `${notificationId}-5min`,
      `${notificationId}-final`,
    ];

    timerIds.forEach((timerId) => {
      const timer = this.timers.get(timerId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(timerId);
      }
    });
  }

  /**
   * Register event handler for notification events
   */
  public onNotificationEvent(
    id: string,
    handler: (event: NotificationEvent) => void,
  ): void {
    this.eventHandlers.set(id, handler);
  }

  /**
   * Unregister event handler
   */
  public offNotificationEvent(id: string): void {
    this.eventHandlers.delete(id);
  }

  /**
   * Get current status
   */
  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      userId: this.currentUserId,
      activeNotifications: this.notifications.size,
      activeTimers: this.timers.size,
      notifications: Array.from(this.notifications.values()),
    };
  }

  /**
   * Parse time string to Date object
   */
  private parseTimeString(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Cleanup all resources
   */
  private cleanup(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear state
    this.notifications.clear();
    this.eventHandlers.clear();

    this.isInitialized = false;
    this.currentUserId = null;
  }

  /**
   * Setup cleanup handlers
   */
  private setupCleanupHandlers(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.cleanup());
      window.addEventListener("unload", () => this.cleanup());
    }
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[NotificationScheduler] ${message}`);
    }
  }

  /**
   * Destroy instance
   */
  public destroy(): void {
    this.cleanup();
    NotificationScheduler.instance = null;
  }
}

// Export singleton instance
export const notificationScheduler = NotificationScheduler.getInstance();
