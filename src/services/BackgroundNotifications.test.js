import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Background Notification Scheduler component
const BackgroundNotificationScheduler = ({
  onNotificationTriggered,
  onNavigationRequested,
  onMultipleNotifications,
}) => {
  const [scheduledNotifications, setScheduledNotifications] = React.useState(
    new Map(),
  );
  const [currentTime, setCurrentTime] = React.useState("13:40"); // Mock current time

  // Mock calendar events and tasks data
  const mockEvents = [
    {
      id: 1,
      title: "Meeting",
      event_time: "14:00",
      event_date: "2025-07-13",
      user_id: "test-user",
    },
  ];

  const mockTasks = [
    {
      id: 1,
      title: "Exercise",
      task_time: "15:00",
      task_date: "2025-07-13",
      user_id: "test-user",
      completed: false,
      failed: false,
    },
  ];

  const mockMultipleItems = [
    {
      id: 2,
      title: "Team Standup",
      event_time: "16:00",
      event_date: "2025-07-13",
      type: "event",
    },
    {
      id: 3,
      title: "Code Review",
      task_time: "16:00",
      task_date: "2025-07-13",
      type: "task",
      completed: false,
      failed: false,
    },
    {
      id: 4,
      title: "Client Call",
      event_time: "16:00",
      event_date: "2025-07-13",
      type: "event",
    },
  ];

  // Calculate when notification should appear
  const calculateNotificationTime = (targetTime, minutesBefore) => {
    const [hours, minutes] = targetTime.split(":").map(Number);
    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    const notificationTime = new Date(
      targetDate.getTime() - minutesBefore * 60 * 1000,
    );
    return `${String(notificationTime.getHours()).padStart(2, "0")}:${String(
      notificationTime.getMinutes(),
    ).padStart(2, "0")}`;
  };

  // Schedule notification function
  const scheduleNotification = React.useCallback(
    (item, type, minutesBefore) => {
      const targetTime = item.event_time || item.task_time;
      const notificationId = `${type}-${item.id}-${minutesBefore}min`;

      const notification = {
        id: notificationId,
        itemId: item.id,
        title: item.title,
        type: type,
        targetTime: targetTime,
        minutesBefore: minutesBefore,
        scheduledFor: calculateNotificationTime(targetTime, minutesBefore),
      };

      setScheduledNotifications((prev) =>
        new Map(prev).set(notificationId, notification),
      );
      return notificationId;
    },
    [],
  );

  // Check if it's time to trigger notifications
  const checkNotifications = React.useCallback(() => {
    scheduledNotifications.forEach((notification, id) => {
      if (notification.scheduledFor === currentTime) {
        // Trigger notification
        const notificationData = {
          id: notification.id,
          title:
            notification.type === "event"
              ? `Upcoming: ${notification.title} in ${notification.minutesBefore} minutes`
              : `Task due: ${notification.title} in ${notification.minutesBefore} minutes`,
          body:
            notification.type === "event"
              ? `Event starting at ${notification.targetTime}`
              : `Task deadline at ${notification.targetTime}`,
          type: notification.type,
          itemId: notification.itemId,
          targetTime: notification.targetTime,
        };

        if (onNotificationTriggered) {
          onNotificationTriggered(notificationData);
        }

        // Remove triggered notification
        setScheduledNotifications((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }
    });
  }, [scheduledNotifications, currentTime, onNotificationTriggered]);

  // Auto-check notifications when time changes
  React.useEffect(() => {
    checkNotifications();
  }, [checkNotifications]);

  // Handle notification click navigation
  const handleNotificationClick = React.useCallback(
    (notificationData) => {
      const navigationTarget =
        notificationData.type === "task"
          ? `/tasks?highlight=${notificationData.itemId}`
          : `/calendar?highlight=${notificationData.itemId}`;

      if (onNavigationRequested) {
        onNavigationRequested({
          target: navigationTarget,
          itemId: notificationData.itemId,
          type: notificationData.type,
        });
      }
    },
    [onNavigationRequested],
  );

  return (
    <div>
      <div data-testid="current-time">{currentTime}</div>
      <div data-testid="scheduled-count">{scheduledNotifications.size}</div>

      {/* Event scheduling controls */}
      <button
        data-testid="schedule-event-btn"
        onClick={() => {
          const eventId = scheduleNotification(mockEvents[0], "event", 10);
          console.log(`Scheduled event notification: ${eventId}`);
        }}
      >
        Schedule Event Notification
      </button>

      {/* Task scheduling controls */}
      <button
        data-testid="schedule-task-btn"
        onClick={() => {
          const taskId = scheduleNotification(mockTasks[0], "task", 5);
          console.log(`Scheduled task notification: ${taskId}`);
        }}
      >
        Schedule Task Notification
      </button>

      {/* Multiple notifications scheduling */}
      <button
        data-testid="schedule-multiple-btn"
        onClick={() => {
          const notifications = mockMultipleItems.map((item) =>
            scheduleNotification(item, item.type, 5),
          );
          if (onMultipleNotifications) {
            onMultipleNotifications(notifications);
          }
        }}
      >
        Schedule Multiple Notifications
      </button>

      {/* Time advancement controls */}
      <button
        data-testid="advance-to-event-time"
        onClick={() => setCurrentTime("13:50")} // 10 min before 14:00
      >
        Advance to Event Notification Time
      </button>

      <button
        data-testid="advance-to-task-time"
        onClick={() => setCurrentTime("14:55")} // 5 min before 15:00
      >
        Advance to Task Notification Time
      </button>

      <button
        data-testid="advance-to-multiple-time"
        onClick={() => setCurrentTime("15:55")} // 5 min before 16:00
      >
        Advance to Multiple Notifications Time
      </button>

      {/* Mock notification click area */}
      <div
        data-testid="notification-click-area"
        onClick={() => {
          // Simulate clicking on a task notification
          handleNotificationClick({
            type: "task",
            itemId: 1,
            title: "Exercise",
          });
        }}
      >
        Click to simulate notification click
      </div>
    </div>
  );
};

describe("INTEGRATION TESTS - Background Notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the electron API for notification operations
    global.window.electronAPI = {
      notifications: {
        show: jest.fn(),
        schedule: jest.fn(),
        cancel: jest.fn(),
        showImmediate: jest.fn(),
        requestPermission: jest.fn(),
        scheduleReminder: jest.fn(),
        cancelNotification: jest.fn(),
      },
      db: {
        getEvents: jest.fn().mockResolvedValue([]),
        getTasks: jest.fn().mockResolvedValue([]),
        updateTask: jest.fn().mockResolvedValue({ success: true }),
      },
    };

    // Mock browser notifications
    global.Notification = jest.fn().mockImplementation((title, options) => ({
      title,
      body: options?.body,
      onclick: null,
      close: jest.fn(),
    }));

    // Mock navigation
    global.window.location = { href: "" };
  });

  test("Calendar event notification - Event scheduled for 2025-07-13 14:00", async () => {
    const mockOnNotificationTriggered = jest.fn();
    const mockOnNavigationRequested = jest.fn();

    render(
      <BackgroundNotificationScheduler
        onNotificationTriggered={mockOnNotificationTriggered}
        onNavigationRequested={mockOnNavigationRequested}
      />,
    );

    // Schedule event notification
    fireEvent.click(screen.getByTestId("schedule-event-btn"));

    // Verify notification is scheduled
    expect(screen.getByTestId("scheduled-count")).toHaveTextContent("1");

    // Advance time to notification trigger (10 minutes before event)
    fireEvent.click(screen.getByTestId("advance-to-event-time"));

    await waitFor(() => {
      // Notification appears 10 minutes before (13:50)
      expect(mockOnNotificationTriggered).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Upcoming: Meeting in 10 minutes",
          body: "Event starting at 14:00",
          type: "event",
          itemId: 1,
          targetTime: "14:00",
        }),
      );
    });

    // Verify current time matches expected notification time
    expect(screen.getByTestId("current-time")).toHaveTextContent("13:50");

    // Verify notification was removed after triggering
    expect(screen.getByTestId("scheduled-count")).toHaveTextContent("0");
  });

  test("Task deadline notification - Task with task_time: '15:00'", async () => {
    const mockOnNotificationTriggered = jest.fn();
    const mockOnNavigationRequested = jest.fn();

    render(
      <BackgroundNotificationScheduler
        onNotificationTriggered={mockOnNotificationTriggered}
        onNavigationRequested={mockOnNavigationRequested}
      />,
    );

    // Schedule task notification
    fireEvent.click(screen.getByTestId("schedule-task-btn"));

    // Verify notification is scheduled
    expect(screen.getByTestId("scheduled-count")).toHaveTextContent("1");

    // Advance time to notification trigger (5 minutes before task)
    fireEvent.click(screen.getByTestId("advance-to-task-time"));

    await waitFor(() => {
      // Notification appears 5 minutes before (14:55)
      expect(mockOnNotificationTriggered).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Task due: Exercise in 5 minutes",
          body: "Task deadline at 15:00",
          type: "task",
          itemId: 1,
          targetTime: "15:00",
        }),
      );
    });

    // Verify current time matches expected notification time
    expect(screen.getByTestId("current-time")).toHaveTextContent("14:55");

    // Verify notification was removed after triggering
    expect(screen.getByTestId("scheduled-count")).toHaveTextContent("0");
  });

  test("Notification click navigation - Click on task notification", async () => {
    const mockOnNotificationTriggered = jest.fn();
    const mockOnNavigationRequested = jest.fn();

    render(
      <BackgroundNotificationScheduler
        onNotificationTriggered={mockOnNotificationTriggered}
        onNavigationRequested={mockOnNavigationRequested}
      />,
    );

    // Simulate clicking on a notification
    fireEvent.click(screen.getByTestId("notification-click-area"));

    await waitFor(() => {
      // App opens to Tasks page showing relevant task
      expect(mockOnNavigationRequested).toHaveBeenCalledWith(
        expect.objectContaining({
          target: "/tasks?highlight=1",
          itemId: 1,
          type: "task",
        }),
      );
    });

    // Verify navigation target is correct for task
    const navigationCall = mockOnNavigationRequested.mock.calls[0][0];
    expect(navigationCall.target).toContain("/tasks");
    expect(navigationCall.target).toContain("highlight=1");
    expect(navigationCall.type).toBe("task");
  });

  test("Multiple notifications handling - Multiple events/tasks at same time", async () => {
    const mockOnNotificationTriggered = jest.fn();
    const mockOnMultipleNotifications = jest.fn();

    render(
      <BackgroundNotificationScheduler
        onNotificationTriggered={mockOnNotificationTriggered}
        onMultipleNotifications={mockOnMultipleNotifications}
      />,
    );

    // Schedule multiple notifications for the same time
    fireEvent.click(screen.getByTestId("schedule-multiple-btn"));

    await waitFor(() => {
      // Multiple notifications scheduled
      expect(mockOnMultipleNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("event-2-5min"), // Team Standup
          expect.stringContaining("task-3-5min"), // Code Review
          expect.stringContaining("event-4-5min"), // Client Call
        ]),
      );
    });

    // Verify all notifications are scheduled
    expect(screen.getByTestId("scheduled-count")).toHaveTextContent("3");

    // Advance time to trigger all notifications
    fireEvent.click(screen.getByTestId("advance-to-multiple-time"));

    await waitFor(() => {
      // All notifications appear without conflicts
      expect(mockOnNotificationTriggered).toHaveBeenCalledTimes(3);

      // Each notification displays correctly
      expect(mockOnNotificationTriggered).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Team Standup"),
          type: "event",
        }),
      );

      expect(mockOnNotificationTriggered).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Code Review"),
          type: "task",
        }),
      );

      expect(mockOnNotificationTriggered).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Client Call"),
          type: "event",
        }),
      );
    });

    // Verify all notifications were processed and removed
    expect(screen.getByTestId("scheduled-count")).toHaveTextContent("0");
  });
});
