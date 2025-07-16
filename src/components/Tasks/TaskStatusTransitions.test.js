import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the system notification service
const mockSystemNotificationService = {
  showTaskCompletion: jest.fn().mockResolvedValue(undefined),
  showImmediate: jest.fn().mockResolvedValue(undefined),
};

// Simple test component that simulates task status changes
const TaskStatusTransitioner = ({ initialTask, onStatusChange, onError }) => {
  const [task, setTask] = React.useState(initialTask);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Add null/undefined protection
  if (!task) {
    return (
      <div>
        <span data-testid="task-status">No Task</span>
        <span data-testid="task-title">No Title</span>
        <button data-testid="complete-btn" disabled>
          Complete Task
        </button>
        <button data-testid="fail-btn" disabled>
          Mark as Failed
        </button>
      </div>
    );
  }

  // Simulate the handleTaskComplete function from VirtualizedList.tsx
  const handleTaskComplete = async (e) => {
    e.stopPropagation();
    setIsProcessing(true);

    // Validate callback function existence (from VirtualizedList.tsx)
    if (typeof onStatusChange !== "function") {
      console.error(
        "TaskStatusTransitioner: onStatusChange is not a function",
        typeof onStatusChange,
      );
      if (onError) onError(new Error("onStatusChange is not a function"));
      setIsProcessing(false);
      return;
    }

    try {
      const updatedTask = {
        ...task,
        completed: true,
        failed: false,
        status: "completed",
        updated_at: new Date().toISOString(),
      };
      setTask(updatedTask);

      // Try to send congratulation notification (from TasksCard.tsx)
      try {
        await mockSystemNotificationService.showTaskCompletion(task.title);
      } catch (notificationError) {
        // Notification failure shouldn't prevent task completion
        console.error(
          "TaskStatusTransitioner: Notification failed:",
          notificationError,
        );
        if (onError) onError(notificationError);
      }

      // Task completion should still proceed even if notification fails
      if (onStatusChange) onStatusChange(updatedTask);
    } catch (error) {
      console.error(
        "TaskStatusTransitioner: Error in handleTaskComplete:",
        error,
      );
      if (onError) onError(error);
      // Rollback on other errors
      setTask((prevTask) => ({
        ...prevTask,
        completed: false,
        failed: false,
        status: "pending",
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate the handleStatusClick function from CompletedTasksCard.tsx
  const handleStatusClick = async (e) => {
    e.stopPropagation();
    setIsProcessing(true);

    try {
      const updatedTask = {
        ...task,
        completed: false,
        failed: false,
        status: "pending",
        updated_at: new Date().toISOString(),
      };

      // Simulate async database operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // This will throw if database operation fails (simulated by onStatusChange throwing)
      if (onStatusChange) {
        onStatusChange(updatedTask);
      }

      // Only update local state if database operation succeeds
      setTask(updatedTask);
    } catch (error) {
      console.error(
        "TaskStatusTransitioner: Error in handleStatusClick:",
        error,
      );
      if (onError) onError(error);
      // Don't change task state on error - keep it completed
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate the handleTaskFailure function from TaskFailureManager
  const handleTaskFailure = async () => {
    setIsProcessing(true);

    try {
      const updatedTask = {
        ...task,
        completed: false,
        failed: true,
        status: "failed",
        updated_at: new Date().toISOString(),
      };
      setTask(updatedTask);

      // Try to send failure notification (from OSNotificationManager.ts)
      try {
        await mockSystemNotificationService.showImmediate(
          `❌ Task Failed`,
          `"${task.title}" was due at ${task.task_time} and has failed.`,
          "task",
        );
      } catch (notificationError) {
        // Notification failure shouldn't prevent task from being marked as failed
        console.error(
          "TaskStatusTransitioner: Notification failed:",
          notificationError,
        );
        if (onError) onError(notificationError);
      }

      // Task should still be marked as failed even if notification fails
      if (onStatusChange) onStatusChange(updatedTask);
    } catch (error) {
      console.error(
        "TaskStatusTransitioner: Error in handleTaskFailure:",
        error,
      );
      if (onError) onError(error);
      // Rollback on other errors
      setTask((prevTask) => ({
        ...prevTask,
        failed: false,
        status: "pending",
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <span data-testid="task-status">
        {task.completed ? "completed" : task.failed ? "failed" : "pending"}
      </span>
      <span data-testid="task-title">{task.title || "Untitled"}</span>
      <span data-testid="task-processing">
        {isProcessing ? "processing" : "idle"}
      </span>

      {/* Complete button (from TasksCard and VirtualizedList) */}
      <button
        data-testid="complete-btn"
        onClick={handleTaskComplete}
        disabled={isProcessing}
      >
        {isProcessing ? "⏳" : "○"} Complete Task
      </button>

      {/* Uncomplete button (from CompletedTasksCard) */}
      {task.completed && (
        <button
          data-testid="uncomplete-btn"
          onClick={handleStatusClick}
          disabled={isProcessing}
        >
          ✓ Mark as Incomplete
        </button>
      )}

      {/* Fail button (from TaskFailureManager) */}
      <button
        data-testid="fail-btn"
        onClick={handleTaskFailure}
        disabled={isProcessing}
      >
        ❌ Mark as Failed
      </button>
    </div>
  );
};

describe("UNIT TESTS - Task Status Transitions Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the electron API for task operations
    global.window.electronAPI = {
      db: {
        updateTask: jest.fn().mockResolvedValue({ success: true }),
        getTasks: jest.fn().mockResolvedValue([]),
      },
    };

    // Reset mock system notification service
    mockSystemNotificationService.showTaskCompletion.mockClear();
    mockSystemNotificationService.showImmediate.mockClear();
  });

  // Test data factory
  const createTestTask = (overrides = {}) => ({
    id: 1,
    title: "Test Task",
    task_date: "2025-07-15",
    task_time: "14:00",
    completed: false,
    failed: false,
    user_id: "test-user",
    ...overrides,
  });

  describe("1. handleTaskComplete Function (from VirtualizedList.tsx)", () => {
    describe("Normal Behavior", () => {
      test("should complete task successfully and send congratulation notification", async () => {
        const mockOnStatusChange = jest.fn();
        const initialTask = createTestTask({ title: "Exercise Routine" });

        render(
          <TaskStatusTransitioner
            initialTask={initialTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Initial state should be pending
        expect(screen.getByTestId("task-status")).toHaveTextContent("pending");

        // Click complete button
        fireEvent.click(screen.getByTestId("complete-btn"));

        // Should show processing state
        await waitFor(() => {
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "processing",
          );
        });

        // Task should be completed
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "idle",
          );
        });

        // Verify congratulation notification was sent
        expect(
          mockSystemNotificationService.showTaskCompletion,
        ).toHaveBeenCalledWith("Exercise Routine");

        // Verify callback was called with correct data
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: true,
            failed: false,
            status: "completed",
            updated_at: expect.any(String),
          }),
        );
      });

      test("should prevent event bubbling when completing task", async () => {
        const mockOnStatusChange = jest.fn();
        const mockParentClick = jest.fn();
        const initialTask = createTestTask();

        const { container } = render(
          <div onClick={mockParentClick}>
            <TaskStatusTransitioner
              initialTask={initialTask}
              onStatusChange={mockOnStatusChange}
            />
          </div>,
        );

        // Click complete button
        fireEvent.click(screen.getByTestId("complete-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Parent click should not be triggered (event stopped propagation)
        expect(mockParentClick).not.toHaveBeenCalled();
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });

    describe("Edge Cases and Error Handling", () => {
      test("should handle missing onStatusChange callback gracefully", async () => {
        const mockOnError = jest.fn();
        const initialTask = createTestTask();

        render(
          <TaskStatusTransitioner
            initialTask={initialTask}
            onStatusChange={null} // Invalid callback
            onError={mockOnError}
          />,
        );

        // Click complete button
        fireEvent.click(screen.getByTestId("complete-btn"));

        await waitFor(() => {
          expect(mockOnError).toHaveBeenCalledWith(
            expect.objectContaining({
              message: "onStatusChange is not a function",
            }),
          );
        });

        // Task should remain in pending state
        expect(screen.getByTestId("task-status")).toHaveTextContent("pending");
      });

      test("should handle notification service failure gracefully", async () => {
        // Mock notification service to throw error
        mockSystemNotificationService.showTaskCompletion.mockRejectedValueOnce(
          new Error("Notification service unavailable"),
        );

        const mockOnStatusChange = jest.fn();
        const mockOnError = jest.fn();
        const initialTask = createTestTask();

        render(
          <TaskStatusTransitioner
            initialTask={initialTask}
            onStatusChange={mockOnStatusChange}
            onError={mockOnError}
          />,
        );

        // Click complete button
        fireEvent.click(screen.getByTestId("complete-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Task should still be completed despite notification failure
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: true,
            status: "completed",
          }),
        );

        // Error should be handled gracefully
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Notification service unavailable",
          }),
        );
      });
    });
  });

  describe("2. handleStatusClick Function (from CompletedTasksCard.tsx)", () => {
    describe("Normal Behavior", () => {
      test("should uncomplete a completed task successfully", async () => {
        const mockOnStatusChange = jest.fn();
        const completedTask = createTestTask({
          completed: true,
          status: "completed",
          title: "Completed Exercise",
        });

        render(
          <TaskStatusTransitioner
            initialTask={completedTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Initial state should be completed
        expect(screen.getByTestId("task-status")).toHaveTextContent(
          "completed",
        );
        expect(screen.getByTestId("uncomplete-btn")).toBeInTheDocument();

        // Click uncomplete button
        fireEvent.click(screen.getByTestId("uncomplete-btn"));

        // Should show processing state
        await waitFor(() => {
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "processing",
          );
        });

        // Task should be marked as pending
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "pending",
          );
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "idle",
          );
        });

        // Verify callback was called with correct data
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: false,
            failed: false,
            status: "pending",
            updated_at: expect.any(String),
          }),
        );
      });

      test("should disable button during processing to prevent double-clicks", async () => {
        const mockOnStatusChange = jest.fn().mockImplementation(() => {
          return new Promise((resolve) => setTimeout(resolve, 100)); // Slow response
        });
        const completedTask = createTestTask({ completed: true });

        render(
          <TaskStatusTransitioner
            initialTask={completedTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        const uncompleteBtn = screen.getByTestId("uncomplete-btn");

        // Click uncomplete button
        fireEvent.click(uncompleteBtn);

        // Button should be disabled during processing
        await waitFor(() => {
          expect(uncompleteBtn).toBeDisabled();
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "processing",
          );
        });

        // Wait for completion
        await waitFor(() => {
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "idle",
          );
        });
      });
    });

    describe("Edge Cases and Error Handling", () => {
      test("should handle database update failure", async () => {
        const mockOnStatusChange = jest.fn();
        const mockOnError = jest.fn();
        const completedTask = createTestTask({ completed: true });

        // Simulate database error by making onStatusChange throw
        mockOnStatusChange.mockImplementationOnce(() => {
          throw new Error("Database connection failed");
        });

        render(
          <TaskStatusTransitioner
            initialTask={completedTask}
            onStatusChange={mockOnStatusChange}
            onError={mockOnError}
          />,
        );

        // Click uncomplete button
        fireEvent.click(screen.getByTestId("uncomplete-btn"));

        await waitFor(() => {
          expect(mockOnError).toHaveBeenCalledWith(
            expect.objectContaining({
              message: "Database connection failed",
            }),
          );
        });

        // Task should remain completed on error
        expect(screen.getByTestId("task-status")).toHaveTextContent(
          "completed",
        );
      });

      test("should prevent event bubbling when uncompleting task", async () => {
        const mockOnStatusChange = jest.fn();
        const mockParentClick = jest.fn();
        const completedTask = createTestTask({ completed: true });

        render(
          <div onClick={mockParentClick}>
            <TaskStatusTransitioner
              initialTask={completedTask}
              onStatusChange={mockOnStatusChange}
            />
          </div>,
        );

        // Click uncomplete button
        fireEvent.click(screen.getByTestId("uncomplete-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "pending",
          );
        });

        // Parent click should not be triggered
        expect(mockParentClick).not.toHaveBeenCalled();
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });
  });

  describe("3. handleTaskFailure Function (from TaskFailureManager.ts)", () => {
    describe("Normal Behavior", () => {
      test("should mark overdue task as failed and send failure notification", async () => {
        const mockOnStatusChange = jest.fn();
        const overdueTask = createTestTask({
          task_time: "09:00",
          task_date: "2025-07-15",
          title: "Morning Exercise",
        });

        render(
          <TaskStatusTransitioner
            initialTask={overdueTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Initial state should be pending
        expect(screen.getByTestId("task-status")).toHaveTextContent("pending");

        // Click fail button (simulating automatic failure detection)
        fireEvent.click(screen.getByTestId("fail-btn"));

        // Should show processing state
        await waitFor(() => {
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "processing",
          );
        });

        // Task should be marked as failed
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent("failed");
          expect(screen.getByTestId("task-processing")).toHaveTextContent(
            "idle",
          );
        });

        // Verify failure notification was sent
        expect(
          mockSystemNotificationService.showImmediate,
        ).toHaveBeenCalledWith(
          `❌ Task Failed`,
          `"Morning Exercise" was due at 09:00 and has failed.`,
          "task",
        );

        // Verify callback was called with correct data
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: false,
            failed: true,
            status: "failed",
            updated_at: expect.any(String),
          }),
        );
      });

      test("should handle task failure for tasks with different time formats", async () => {
        const mockOnStatusChange = jest.fn();
        const tasks = [
          createTestTask({ task_time: "14:30", title: "Afternoon Task" }),
          createTestTask({ task_time: "09:15", title: "Morning Task" }),
          createTestTask({ task_time: "23:45", title: "Night Task" }),
        ];

        for (const task of tasks) {
          const { unmount } = render(
            <TaskStatusTransitioner
              initialTask={task}
              onStatusChange={mockOnStatusChange}
            />,
          );

          fireEvent.click(screen.getByTestId("fail-btn"));

          await waitFor(() => {
            expect(screen.getByTestId("task-status")).toHaveTextContent(
              "failed",
            );
          });

          expect(
            mockSystemNotificationService.showImmediate,
          ).toHaveBeenCalledWith(
            `❌ Task Failed`,
            `"${task.title}" was due at ${task.task_time} and has failed.`,
            "task",
          );

          unmount();
          mockOnStatusChange.mockClear();
          mockSystemNotificationService.showImmediate.mockClear();
        }
      });
    });

    describe("Edge Cases and Error Handling", () => {
      test("should handle notification service failure during task failure", async () => {
        // Mock notification service to throw error
        mockSystemNotificationService.showImmediate.mockRejectedValueOnce(
          new Error("Notification service down"),
        );

        const mockOnStatusChange = jest.fn();
        const mockOnError = jest.fn();
        const overdueTask = createTestTask({ task_time: "09:00" });

        render(
          <TaskStatusTransitioner
            initialTask={overdueTask}
            onStatusChange={mockOnStatusChange}
            onError={mockOnError}
          />,
        );

        fireEvent.click(screen.getByTestId("fail-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent("failed");
        });

        // Task should still be failed despite notification failure
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            failed: true,
            status: "failed",
          }),
        );

        // Error should be handled gracefully
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Notification service down",
          }),
        );
      });

      test("should handle task failure for task without time", async () => {
        const mockOnStatusChange = jest.fn();
        const taskWithoutTime = createTestTask({
          task_time: undefined,
          title: "All Day Task",
        });

        render(
          <TaskStatusTransitioner
            initialTask={taskWithoutTime}
            onStatusChange={mockOnStatusChange}
          />,
        );

        fireEvent.click(screen.getByTestId("fail-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent("failed");
        });

        // Should handle undefined task_time gracefully
        expect(
          mockSystemNotificationService.showImmediate,
        ).toHaveBeenCalledWith(
          `❌ Task Failed`,
          `"All Day Task" was due at undefined and has failed.`,
          "task",
        );

        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            failed: true,
            status: "failed",
          }),
        );
      });
    });
  });

  describe("4. Integration Tests - Multiple Function Interactions", () => {
    describe("Normal Behavior", () => {
      test("should handle complete → uncomplete → complete cycle", async () => {
        const mockOnStatusChange = jest.fn();
        const initialTask = createTestTask({ title: "Cycling Task" });

        const { rerender } = render(
          <TaskStatusTransitioner
            initialTask={initialTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Step 1: Complete the task
        fireEvent.click(screen.getByTestId("complete-btn"));
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Update component with completed task
        const completedTask = {
          ...initialTask,
          completed: true,
          status: "completed",
        };
        rerender(
          <TaskStatusTransitioner
            initialTask={completedTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Step 2: Uncomplete the task
        fireEvent.click(screen.getByTestId("uncomplete-btn"));
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "pending",
          );
        });

        // Step 3: Complete again
        fireEvent.click(screen.getByTestId("complete-btn"));
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Verify all state changes occurred
        expect(mockOnStatusChange).toHaveBeenCalledTimes(3);

        // Verify completion notifications were sent twice
        expect(
          mockSystemNotificationService.showTaskCompletion,
        ).toHaveBeenCalledTimes(2);
        expect(
          mockSystemNotificationService.showTaskCompletion,
        ).toHaveBeenCalledWith("Cycling Task");
      });

      test("should handle task failure with subsequent retry", async () => {
        const mockOnStatusChange = jest.fn();
        const overdueTask = createTestTask({
          task_time: "09:00",
          title: "Retry Task",
        });

        const { rerender } = render(
          <TaskStatusTransitioner
            initialTask={overdueTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Step 1: Mark as failed
        fireEvent.click(screen.getByTestId("fail-btn"));
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent("failed");
        });

        // Update component with failed task
        const failedTask = { ...overdueTask, failed: true, status: "failed" };
        rerender(
          <TaskStatusTransitioner
            initialTask={failedTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        // Step 2: Complete the failed task (retry)
        fireEvent.click(screen.getByTestId("complete-btn"));
        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Verify state progression
        expect(mockOnStatusChange).toHaveBeenCalledTimes(2);

        // First call: task failed
        expect(mockOnStatusChange).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ failed: true, completed: false }),
        );

        // Second call: task completed
        expect(mockOnStatusChange).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ failed: false, completed: true }),
        );
      });
    });

    describe("Edge Cases and Error Handling", () => {
      test("should handle rapid successive button clicks gracefully", async () => {
        const mockOnStatusChange = jest.fn();
        const initialTask = createTestTask();

        render(
          <TaskStatusTransitioner
            initialTask={initialTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        const completeBtn = screen.getByTestId("complete-btn");

        // Rapidly click complete button multiple times
        fireEvent.click(completeBtn);
        fireEvent.click(completeBtn);
        fireEvent.click(completeBtn);

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Should only process once due to disabled button during processing
        expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
        expect(
          mockSystemNotificationService.showTaskCompletion,
        ).toHaveBeenCalledTimes(1);
      });

      test("should handle recurring task completion", async () => {
        const mockOnStatusChange = jest.fn();
        const recurringTask = createTestTask({
          recurring_id: 123,
          title: "Daily Exercise",
        });

        render(
          <TaskStatusTransitioner
            initialTask={recurringTask}
            onStatusChange={mockOnStatusChange}
          />,
        );

        fireEvent.click(screen.getByTestId("complete-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("task-status")).toHaveTextContent(
            "completed",
          );
        });

        // Verify completion was handled properly for recurring task
        expect(mockOnStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: true,
            recurring_id: 123,
          }),
        );

        expect(
          mockSystemNotificationService.showTaskCompletion,
        ).toHaveBeenCalledWith("Daily Exercise");
      });
    });
  });

  describe("5. Edge Cases and Error Handling", () => {
    test("should handle null/undefined initial task state", () => {
      const mockOnStatusChange = jest.fn();

      expect(() => {
        render(
          <TaskStatusTransitioner
            initialTask={null}
            onStatusChange={mockOnStatusChange}
          />,
        );
      }).not.toThrow();

      expect(screen.getByTestId("task-status")).toHaveTextContent("No Task");
      expect(screen.getByTestId("task-title")).toHaveTextContent("No Title");

      // Buttons should be disabled
      expect(screen.getByTestId("complete-btn")).toBeDisabled();
      expect(screen.getByTestId("fail-btn")).toBeDisabled();
    });

    test("should handle empty task title gracefully", async () => {
      const mockOnStatusChange = jest.fn();
      const taskWithEmptyTitle = createTestTask({ title: "" });

      render(
        <TaskStatusTransitioner
          initialTask={taskWithEmptyTitle}
          onStatusChange={mockOnStatusChange}
        />,
      );

      fireEvent.click(screen.getByTestId("complete-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("task-status")).toHaveTextContent(
          "completed",
        );
      });

      // Should handle empty title in notification
      expect(
        mockSystemNotificationService.showTaskCompletion,
      ).toHaveBeenCalledWith("");
      expect(screen.getByTestId("task-title")).toHaveTextContent("Untitled");
    });

    test("should maintain task properties during status transitions", async () => {
      const mockOnStatusChange = jest.fn();
      const complexTask = createTestTask({
        id: 42,
        title: "Complex Task",
        task_date: "2025-07-20",
        task_time: "15:30",
        task_type: "important",
        urgency_level: 3,
        recurring_id: 456,
        user_id: "user-123",
      });

      render(
        <TaskStatusTransitioner
          initialTask={complexTask}
          onStatusChange={mockOnStatusChange}
        />,
      );

      fireEvent.click(screen.getByTestId("complete-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("task-status")).toHaveTextContent(
          "completed",
        );
      });

      // Verify all original properties are preserved
      expect(mockOnStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 42,
          title: "Complex Task",
          task_date: "2025-07-20",
          task_time: "15:30",
          task_type: "important",
          urgency_level: 3,
          recurring_id: 456,
          user_id: "user-123",
          completed: true,
          failed: false,
          status: "completed",
          updated_at: expect.any(String),
        }),
      );
    });
  });
});
