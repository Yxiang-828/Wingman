/**
 * Professional Frontend Notification Service
 *
 * Lightweight wrapper that communicates with the professional background service
 * instead of doing its own database polling.
 *
 * Based on Slack/Discord patterns where frontend shows immediate notifications
 * and background service handles scheduling/persistence.
 */

import { notificationScheduler } from "./NotificationScheduler";
import { notificationDataBridge } from "./NotificationDataBridge";
import { getCurrentUserId } from "../utils/auth";

export interface NotificationStatus {
  isActive: boolean;
  userId: string | null;
  activeNotifications: number;
  lastUpdate: string;
}

class ProfessionalNotificationService {
  private static instance: ProfessionalNotificationService | null = null;
  private isActive = false;
  private initialized = false;

  private constructor() {
    this.setupCleanupHandlers();
  }

  public static getInstance(): ProfessionalNotificationService {
    if (!ProfessionalNotificationService.instance) {
      ProfessionalNotificationService.instance =
        new ProfessionalNotificationService();
    }
    return ProfessionalNotificationService.instance;
  }

  /**
   * Initialize the professional notification system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("ProfessionalNotificationService: Already initialized");
      return;
    }

    console.log(
      "ProfessionalNotificationService: Initializing professional notification system",
    );

    try {
      // Get current user
      const userId = getCurrentUserId();
      if (!userId) {
        console.log(
          "📱 No user logged in - notifications will initialize when user logs in",
        );
        return;
      }

      // Initialize in-memory scheduler
      await notificationScheduler.initialize(userId);

      // Setup event bridge for real-time updates
      notificationDataBridge.activate(); // Register notification event handler
      notificationScheduler.onNotificationEvent(
        "frontend",
        this.handleNotificationEvent.bind(this),
      );

      // Store user for background service
      if (window.electronAPI?.user?.storeActiveUser) {
        await window.electronAPI.user.storeActiveUser(userId);
      }

      this.isActive = true;
      this.initialized = true;

      console.log("Professional notification system initialized");
    } catch (error) {
      console.error(
        "Failed to initialize professional notification system:",
        error,
      );
      throw error;
    }
  }

  /**
   * Handle notification events from scheduler
   */
  private async handleNotificationEvent(event: any): Promise<void> {
    try {
      console.log(
        `📱 Handling notification event: ${event.type} for ${event.notification.title}`,
      );

      let title: string;
      let body: string;
      let icon: string;

      switch (event.type) {
        case "reminder30min":
          title = `⏰ ${
            event.notification.type === "task" ? "Task" : "Event"
          } Reminder`;
          body = `"${event.notification.title}" ${
            event.notification.type === "task" ? "is due" : "starts"
          } in 30 minutes`;
          icon = "⏰";
          break;

        case "reminder5min":
          title = `🚨 ${
            event.notification.type === "task" ? "Task" : "Event"
          } Alert`;
          body = `"${event.notification.title}" ${
            event.notification.type === "task" ? "is due" : "starts"
          } in 5 minutes`;
          icon = "🚨";
          break;

        case "task_overdue":
          title = "❌ Task Failed";
          body = `"${event.notification.title}" was due at ${event.notification.targetTime} and has failed`;
          icon = "❌";

          // Mark task as failed in database
          if (window.electronAPI?.db?.updateTask) {
            await window.electronAPI.db.updateTask(
              event.notification.originalId,
              { failed: true },
            );
          }

          // Dispatch UI update events
          window.dispatchEvent(
            new CustomEvent("task-failed", {
              detail: {
                taskId: event.notification.originalId,
                title: event.notification.title,
              },
            }),
          );
          break;

        case "event_start":
          title = "🎯 Event Starting";
          body = `"${event.notification.title}" is starting now!`;
          icon = "🎯";
          break;

        default:
          console.warn("📱 Unknown notification event type:", event.type);
          return;
      }

      // Show immediate browser notification
      await this.showImmediateNotification(title, body, icon);

      // Dispatch general refresh events
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    } catch (error) {
      console.error("📱 Error handling notification event:", error);
    }
  }
  /**
   * Show immediate browser notification
   */
  private async showImmediateNotification(
    title: string,
    body: string,
    _icon: string,
  ): Promise<void> {
    try {
      // Request permission if needed
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission === "granted") {
          const notification = new Notification(title, {
            body: body,
            icon: "/src/assets/productive.png",
            tag: `wingman-${Date.now()}`,
            requireInteraction: false,
          });

          // Auto-close after 8 seconds
          setTimeout(() => notification.close(), 8000);

          // Handle click to focus app
          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          console.log(`📱 Showed notification: ${title}`);
        }
      }

      // Also try Electron notification if available
      if (window.electronAPI?.notifications?.showImmediate) {
        await window.electronAPI.notifications.showImmediate({
          title,
          body,
          type: "info",
          iconPath: "/src/assets/productive.png",
        });
      }
    } catch (error) {
      console.error("📱 Error showing immediate notification:", error);
    }
  }

  /**
   * Activate notifications for a user
   */
  public async activate(userId: string): Promise<void> {
    if (this.isActive) {
      console.log("📱 Notifications already active");
      return;
    }

    try {
      console.log(`📱 Activating notifications for user ${userId}`);

      // Initialize scheduler for this user
      await notificationScheduler.initialize(userId); // Activate data bridge
      notificationDataBridge.activate();

      // Store user for background service
      if (window.electronAPI?.user?.storeActiveUser) {
        await window.electronAPI.user.storeActiveUser(userId);
      }

      this.isActive = true;
      console.log("✅ Notifications activated");
    } catch (error) {
      console.error("❌ Failed to activate notifications:", error);
      throw error;
    }
  }

  /**
   * Deactivate notifications
   */
  public deactivate(): void {
    console.log("📱 Deactivating notifications");

    // Deactivate data bridge
    notificationDataBridge.deactivate();

    // Unregister event handler
    notificationScheduler.offNotificationEvent("frontend");

    this.isActive = false;
    console.log("✅ Notifications deactivated");
  }

  /**
   * Test notification system
   */
  public async testNotifications(): Promise<boolean> {
    try {
      console.log("📱 Testing notification system...");

      // Test browser notifications
      if ("Notification" in window) {
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("❌ Browser notifications denied");
            return false;
          }
        }

        // Show test notification
        const notification = new Notification("🧪 Test Notification", {
          body: "Professional notification system is working!",
          icon: "/src/assets/productive.png",
          tag: "wingman-test",
        });

        setTimeout(() => notification.close(), 3000);
        console.log("✅ Browser notifications working");
      }

      // Test Electron notifications
      if (window.electronAPI?.notifications?.showImmediate) {
        await window.electronAPI.notifications.showImmediate({
          title: "🧪 Test Notification",
          body: "Electron notifications working!",
          type: "info",
        });
        console.log("✅ Electron notifications working");
      }

      return true;
    } catch (error) {
      console.error("❌ Notification test failed:", error);
      return false;
    }
  }

  /**
   * Get notification service status
   */
  public getStatus(): NotificationStatus {
    const schedulerStatus = notificationScheduler.getStatus();
    const bridgeStatus = notificationDataBridge.getStatus();

    return {
      isActive: this.isActive && bridgeStatus.isActive,
      userId: schedulerStatus.userId,
      activeNotifications: schedulerStatus.activeNotifications,
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Show task completion celebration
   */
  public async showTaskCompletion(taskTitle: string): Promise<void> {
    await this.showImmediateNotification(
      "🎉 Task Completed!",
      `Great job completing "${taskTitle}"!`,
      "🎉",
    );
  }

  /**
   * Request notification permissions
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        console.log(`📱 Notification permission: ${permission}`);
        return permission === "granted";
      }
      return false;
    } catch (error) {
      console.error("📱 Error requesting notification permissions:", error);
      return false;
    }
  }

  /**
   * Setup cleanup handlers
   */
  private setupCleanupHandlers(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.deactivate());
      window.addEventListener("unload", () => this.deactivate());
    }
  }

  /**
   * Destroy service
   */
  public destroy(): void {
    this.deactivate();
    ProfessionalNotificationService.instance = null;
  }
}

// Export singleton instance
export const professionalNotificationService =
  ProfessionalNotificationService.getInstance();

// Export test function for React components
export const testNotifications = async (): Promise<boolean> => {
  return await professionalNotificationService.testNotifications();
};
