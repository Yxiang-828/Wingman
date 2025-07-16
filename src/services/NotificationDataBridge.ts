/**
 * DataContext Integration for Professional Notification System
 *
 * This service bridges DataContext CRUD operations with the NotificationScheduler
 * to provide real-time, event-driven updates without database polling.
 *
 * Based on Discord patterns where data changes immediately update
 * in-memory state rather than requiring periodic polling.
 */

import { notificationScheduler } from "./NotificationScheduler";

class NotificationDataBridge {
  private static instance: NotificationDataBridge | null = null;
  private isActive = false;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): NotificationDataBridge {
    if (!NotificationDataBridge.instance) {
      NotificationDataBridge.instance = new NotificationDataBridge();
    }
    return NotificationDataBridge.instance;
  }

  /**
   * Activate the bridge to start listening to DataContext events
   */
  public activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log(
      "NotificationDataBridge: Activated - notifications now real-time",
    );
  }

  /**
   * Deactivate the bridge
   */
  public deactivate(): void {
    this.isActive = false;
    console.log("NotificationDataBridge: Deactivated");
  }
  /**
   * Setup event listeners for DataContext events
   */
  private setupEventListeners(): void {
    if (typeof window === "undefined") return;

    // Task events - cast to EventListener to fix TypeScript
    window.addEventListener(
      "task-created",
      this.handleTaskCreated.bind(this) as EventListener,
    );
    window.addEventListener(
      "task-updated",
      this.handleTaskUpdated.bind(this) as EventListener,
    );
    window.addEventListener(
      "task-deleted",
      this.handleTaskDeleted.bind(this) as EventListener,
    );
    window.addEventListener(
      "task-completed",
      this.handleTaskCompleted.bind(this) as EventListener,
    );

    // Event events
    window.addEventListener(
      "event-created",
      this.handleEventCreated.bind(this) as EventListener,
    );
    window.addEventListener(
      "event-updated",
      this.handleEventUpdated.bind(this) as EventListener,
    );
    window.addEventListener(
      "event-deleted",
      this.handleEventDeleted.bind(this) as EventListener,
    );

    // Global refresh events
    window.addEventListener(
      "notifications-refresh",
      this.handleRefresh.bind(this) as EventListener,
    );
    window.addEventListener(
      "dashboard-refresh",
      this.handleRefresh.bind(this) as EventListener,
    );

    console.log("NotificationDataBridge: Event listeners registered");
  }

  /**
   * Handle task created event
   */
  private handleTaskCreated(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const task = event.detail;
      console.log("NotificationDataBridge: Task created:", task.title);
      notificationScheduler.onTaskCreated(task);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling task created:",
        error,
      );
    }
  }

  /**
   * Handle task updated event
   */
  private handleTaskUpdated(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const task = event.detail;
      console.log("NotificationDataBridge: Task updated:", task.title);
      notificationScheduler.onTaskUpdated(task);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling task updated:",
        error,
      );
    }
  }

  /**
   * Handle task deleted event
   */
  private handleTaskDeleted(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const { taskId } = event.detail;
      console.log("NotificationDataBridge: Task deleted:", taskId);
      notificationScheduler.onTaskDeleted(taskId);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling task deleted:",
        error,
      );
    }
  }

  /**
   * Handle task completed event
   */
  private handleTaskCompleted(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const task = event.detail;
      console.log("NotificationDataBridge: Task completed:", task.title);

      // Treat completion as an update that will remove from notifications
      task.completed = true;
      notificationScheduler.onTaskUpdated(task);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling task completed:",
        error,
      );
    }
  }

  /**
   * Handle event created event
   */
  private handleEventCreated(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const eventData = event.detail;
      console.log("NotificationDataBridge: Event created:", eventData.title);
      notificationScheduler.onEventCreated(eventData);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling event created:",
        error,
      );
    }
  }

  /**
   * Handle event updated event
   */
  private handleEventUpdated(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const eventData = event.detail;
      console.log("NotificationDataBridge: Event updated:", eventData.title);
      notificationScheduler.onEventUpdated(eventData);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling event updated:",
        error,
      );
    }
  }

  /**
   * Handle event deleted event
   */
  private handleEventDeleted(event: CustomEvent): void {
    if (!this.isActive) return;

    try {
      const { eventId } = event.detail;
      console.log("NotificationDataBridge: Event deleted:", eventId);
      notificationScheduler.onEventDeleted(eventId);
    } catch (error) {
      console.error(
        "NotificationDataBridge: Error handling event deleted:",
        error,
      );
    }
  }
  /**
   * Handle refresh events - reinitialize scheduler
   */
  private handleRefresh(_event: Event): void {
    if (!this.isActive) return;

    try {
      console.log(
        "NotificationDataBridge: Refresh event received, reinitializing scheduler",
      );

      // Get current user and reinitialize
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        notificationScheduler.initialize(userId);
      }
    } catch (error) {
      console.error("NotificationDataBridge: Error handling refresh:", error);
    }
  }

  /**
   * Get bridge status
   */
  public getStatus() {
    return {
      isActive: this.isActive,
      schedulerStatus: notificationScheduler.getStatus(),
    };
  }
}

// Export singleton instance
export const notificationDataBridge = NotificationDataBridge.getInstance();
