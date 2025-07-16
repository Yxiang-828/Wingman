/**
 * System Notification Service
 *
 * Handles immediate notifications and task completion celebrations.
 * Works alongside ProfessionalNotificationService:
 * - SystemNotificationService: Immediate notifications, task celebrations
 * - ProfessionalNotificationService: Scheduled reminders, background timing
 *
 * This service provides:
 * - Browser and Electron notification fallbacks
 * - Task completion celebrations with random messages
 * - Immediate notification display
 */

import { getCurrentUserId } from "../utils/auth";

export interface NotificationOptions {
  id: string;
  title: string;
  body: string;
  targetTime: string;
  type: "task" | "event";
  data?: any;
}

class SystemNotificationService {
  /**
   * Request notification permission with dev mode handling
   */
  async requestPermission(): Promise<NotificationPermission> {
    if ("Notification" in window) {
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "granted") {
        console.log("✅ Browser notifications enabled");

        // Test notification
        new Notification("Wingman Notifications Active! 🎉", {
          body: "You'll receive alerts for tasks and events, boss!",
          icon: "/src/assets/productive.png",
          tag: "test-notification",
        });
      } else {
        console.warn("❌ Browser notifications denied");
      }

      return permission;
    }

    return "denied";
  }

  /**
   * Registers notifications with the main process for background handling
   */
  async scheduleNotification(options: NotificationOptions): Promise<void> {
    try {
      // Always register with Electron main process for background notifications
      if (window.electronAPI?.notifications) {
        await window.electronAPI.notifications.schedule({
          id: options.id,
          targetTime: options.targetTime,
          title: options.title,
          body: options.body,
          type: options.type,
        });
      }

      console.log(
        `Background notification registered: ${options.title} for ${options.targetTime}`,
      );
    } catch (error) {
      console.error("Failed to register background notification:", error);
    }
  }

  /**
   * Shows immediate notification with fallbacks
   */
  async showImmediate(
    title: string,
    body: string,
    type: "task" | "event" = "task",
  ): Promise<void> {
    try {
      console.log(`🎯 Wingman: Attempting to send notification - ${title}`);

      // Method 1: Try Electron main process
      if (window.electronAPI?.notifications) {
        await window.electronAPI.notifications.showImmediate({
          title,
          body,
          type,
        });
        console.log("Electron notification sent:", title);
        return;
      }

      // Method 2: Try browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body: body,
          icon: '/src/assets/moody.png', 
          tag: `${type}-immediate`,
          requireInteraction: false,
        });
        console.log("Browser notification sent:", title);
        return;
      }

      // Method 3: Fallback alert
      console.warn("⚠️ Using fallback alert for notification");
      setTimeout(() => {
        alert(`${title}\n\n${body}`);
      }, 100);
    } catch (error) {
      console.error("All notification methods failed:", error);
    }
  }

  /**
   * Shows task completion celebration notification
   */
  async showTaskCompletion(taskTitle: string): Promise<void> {
    const congratsMessages = [
      "Outstanding work, boss! 🎉",
      "Mission accomplished! 💪",
      "Another victory! 🏆",
      "Excellent execution! ⭐",
      "You're crushing it! 🔥",
      "Task mastered! 🎯",
      "Well done, leader! 👑",
      "Perfect completion! ✨",
    ];

    const randomMessage =
      congratsMessages[Math.floor(Math.random() * congratsMessages.length)];

    console.log(
      `🎉 Wingman: Sending completion celebration for task: ${taskTitle}`,
    );

    try {
      await this.showImmediate(
        `🎉 Task Complete!`,
        `${randomMessage}\n"${taskTitle}" has been completed successfully.`,
        "task",
      );
      console.log("✅ Task completion notification sent successfully");
    } catch (error) {
      console.error("❌ Failed to send task completion notification:", error);
    }
  }

  /**
   * Schedules all today's notifications with the main process
   */
  async scheduleAllTodayNotifications(): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      console.log(
        "Registering all today's notifications with background service...",
      );

      // The main process will handle checking these automatically
      // We just need to ensure the user is properly stored
      localStorage.setItem("lastActiveUser", userId);

      console.log("Notifications registered with background service");
    } catch (error) {
      console.error(
        "Failed to register notifications with background service:",
        error,
      );
    }
  }
}
export const systemNotificationService = new SystemNotificationService();
