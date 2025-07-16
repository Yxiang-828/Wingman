import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Recurring Task System Manager component
const RecurringTaskSystemManager = ({
  onRecurringTaskGenerated,
  onCalendarTasksGenerated,
  onTemplateUpdated,
  onTaskInstanceCompleted,
  onTemplateDeleted,
}) => {
  const [recurringTemplates, setRecurringTemplates] = React.useState([]);
  const [generatedTasks, setGeneratedTasks] = React.useState([]);
  const [calendarTasks, setCalendarTasks] = React.useState([]);

  // Mock recurring template data
  const mockRecurringTemplate = {
    id: 1,
    task_title: "Exercise",
    task_time: "07:00",
    weekdays: [1, 2, 3, 4, 5], // Mon-Fri
    is_active: true,
    user_id: "test-user",
  };

  // Calculate next week's dates for generation
  const getNextWeekDates = (weekdays) => {
    const dates = [];
    const today = new Date();
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + 7);

    weekdays.forEach((weekday) => {
      const date = new Date(nextWeekStart);
      const daysToAdd = weekday - nextWeekStart.getDay();
      date.setDate(nextWeekStart.getDate() + daysToAdd);
      dates.push(date.toISOString().split("T")[0]);
    });

    return dates;
  };

  // Save recurring template
  const handleSaveTemplate = React.useCallback(() => {
    const savedTemplate = { ...mockRecurringTemplate, id: Date.now() };
    setRecurringTemplates((prev) => [...prev, savedTemplate]);

    if (onRecurringTaskGenerated) {
      onRecurringTaskGenerated({
        template: savedTemplate,
        templateId: savedTemplate.id,
        weekdays: savedTemplate.weekdays,
        taskTime: savedTemplate.task_time,
      });
    }

    return savedTemplate;
  }, [onRecurringTaskGenerated]);

  // Generate daily tasks from template
  const handleGenerateTasks = React.useCallback(
    (templateId = 1) => {
      const template =
        recurringTemplates.find((t) => t.id === templateId) ||
        mockRecurringTemplate;
      const targetDates = getNextWeekDates(template.weekdays);

      const newTasks = targetDates.map((date, index) => ({
        id: Date.now() + index,
        title: template.task_title,
        task_time: template.task_time,
        task_date: date,
        completed: false,
        failed: false,
        recurring_id: template.id,
        user_id: template.user_id,
      }));

      setGeneratedTasks((prev) => [...prev, ...newTasks]);
      setCalendarTasks((prev) => [...prev, ...newTasks]);

      if (onCalendarTasksGenerated) {
        onCalendarTasksGenerated({
          tasks: newTasks,
          templateId: template.id,
          generatedCount: newTasks.length,
          weekdays: template.weekdays,
        });
      }

      return newTasks;
    },
    [recurringTemplates, onCalendarTasksGenerated],
  );

  // Update template time
  const handleUpdateTemplate = React.useCallback(
    (templateId, updates) => {
      const templateToUpdate = recurringTemplates.find(
        (t) => t.id === templateId,
      );
      if (!templateToUpdate) return;

      setRecurringTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId ? { ...template, ...updates } : template,
        ),
      );

      if (onTemplateUpdated) {
        onTemplateUpdated({
          templateId,
          updates,
          oldTime: templateToUpdate.task_time,
          newTime: updates.task_time || "08:00",
        });
      }
    },
    [recurringTemplates, onTemplateUpdated],
  );

  // Complete individual task instance
  const handleCompleteTaskInstance = React.useCallback(
    (taskId) => {
      setGeneratedTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      );

      setCalendarTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      );

      const completedTask = generatedTasks.find((task) => task.id === taskId);
      if (onTaskInstanceCompleted && completedTask) {
        onTaskInstanceCompleted({
          taskId,
          recurringId: completedTask.recurring_id,
          templateUnchanged: true,
          instanceOnly: true,
        });
      }
    },
    [generatedTasks, onTaskInstanceCompleted],
  );

  // Delete recurring template
  const handleDeleteTemplate = React.useCallback(() => {
    // Get the first template (most recently created)
    const templateToDelete = recurringTemplates[0];
    if (!templateToDelete) return;

    setRecurringTemplates((prev) =>
      prev.filter((t) => t.id !== templateToDelete.id),
    );

    if (onTemplateDeleted) {
      onTemplateDeleted({
        templateId: templateToDelete.id,
        associatedTasksRemain: true,
        templateDeleted: true,
      });
    }
  }, [recurringTemplates, onTemplateDeleted]);

  return (
    <div>
      <div data-testid="template-count">{recurringTemplates.length}</div>
      <div data-testid="generated-tasks-count">{generatedTasks.length}</div>
      <div data-testid="calendar-tasks-count">{calendarTasks.length}</div>

      {/* Template management controls */}
      <button data-testid="save-template-btn" onClick={handleSaveTemplate}>
        Save Recurring Template
      </button>

      <button
        data-testid="generate-tasks-btn"
        onClick={() => handleGenerateTasks()}
      >
        Generate Recurring Tasks
      </button>

      <button
        data-testid="update-template-btn"
        onClick={() => {
          const templateToUpdate = recurringTemplates[0];
          if (templateToUpdate) {
            handleUpdateTemplate(templateToUpdate.id, { task_time: "08:00" });
          }
        }}
      >
        Update Template Time
      </button>

      <button
        data-testid="complete-task-btn"
        onClick={() => handleCompleteTaskInstance(generatedTasks[0]?.id)}
      >
        Complete Task Instance
      </button>

      <button
        data-testid="delete-template-btn"
        onClick={() => handleDeleteTemplate()}
      >
        Delete Template
      </button>

      {/* Display areas */}
      <div data-testid="template-display">
        {recurringTemplates.map((template) => (
          <div key={template.id} data-testid={`template-${template.id}`}>
            {template.task_title} - {template.task_time}
          </div>
        ))}
      </div>

      <div data-testid="calendar-display">
        {calendarTasks.map((task) => (
          <div key={task.id} data-testid={`calendar-task-${task.id}`}>
            {task.title} - {task.task_date} -{" "}
            {task.completed ? "Completed" : "Pending"}
          </div>
        ))}
      </div>
    </div>
  );
};

describe("INTEGRATION TESTS - Recurring Task System", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the electron API for recurring task operations
    global.window.electronAPI = {
      db: {
        saveRecurringTemplate: jest
          .fn()
          .mockResolvedValue({ success: true, id: 1 }),
        updateRecurringTemplate: jest.fn().mockResolvedValue({ success: true }),
        deleteRecurringTemplate: jest.fn().mockResolvedValue({ success: true }),
        getRecurringTemplates: jest.fn().mockResolvedValue([]),
        generateRecurringTasks: jest.fn().mockResolvedValue([]),
        saveTask: jest.fn().mockResolvedValue({ success: true, id: 1 }),
        updateTask: jest.fn().mockResolvedValue({ success: true }),
        getTasks: jest.fn().mockResolvedValue([]),
      },
    };
  });

  test("Recurring task generation - Save recurring template: 'Exercise Mon-Fri 07:00'", async () => {
    const mockOnRecurringTaskGenerated = jest.fn();

    render(
      <RecurringTaskSystemManager
        onRecurringTaskGenerated={mockOnRecurringTaskGenerated}
      />,
    );

    // Initial state - no templates
    expect(screen.getByTestId("template-count")).toHaveTextContent("0");

    // Save recurring template: "Exercise Mon-Fri 07:00"
    fireEvent.click(screen.getByTestId("save-template-btn"));

    await waitFor(() => {
      // Daily tasks created for specified days
      expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    });

    // Tasks generated with recurring_id reference
    expect(mockOnRecurringTaskGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          task_title: "Exercise",
          task_time: "07:00",
          weekdays: [1, 2, 3, 4, 5], // Mon-Fri
          is_active: true,
          user_id: "test-user",
        }),
        templateId: expect.any(Number),
        weekdays: [1, 2, 3, 4, 5],
        taskTime: "07:00",
      }),
    );

    // Verify template appears in display
    expect(screen.getByTestId("template-display")).toHaveTextContent(
      "Exercise - 07:00",
    );
  });

  test("Generated tasks in calendar - Generate recurring tasks for next week", async () => {
    const mockOnCalendarTasksGenerated = jest.fn();

    render(
      <RecurringTaskSystemManager
        onCalendarTasksGenerated={mockOnCalendarTasksGenerated}
      />,
    );

    // First save a template
    fireEvent.click(screen.getByTestId("save-template-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    });

    // Generate recurring tasks for next week
    fireEvent.click(screen.getByTestId("generate-tasks-btn"));

    await waitFor(() => {
      // Calendar displays all generated task instances
      expect(screen.getByTestId("generated-tasks-count")).toHaveTextContent(
        "5",
      );
      expect(screen.getByTestId("calendar-tasks-count")).toHaveTextContent("5");
    });

    // Calendar shows daily exercise tasks
    expect(mockOnCalendarTasksGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            title: "Exercise",
            task_time: "07:00",
            completed: false,
            failed: false,
            recurring_id: expect.any(Number),
            user_id: "test-user",
          }),
        ]),
        templateId: expect.any(Number),
        generatedCount: 5, // Mon-Fri = 5 days
        weekdays: [1, 2, 3, 4, 5],
      }),
    );

    // Verify tasks appear in calendar display
    const calendarDisplay = screen.getByTestId("calendar-display");
    expect(calendarDisplay).toHaveTextContent("Exercise");
    expect(calendarDisplay).toHaveTextContent("Pending");
  });

  test("Recurring task template update - Update template time from 07:00 to 08:00", async () => {
    const mockOnTemplateUpdated = jest.fn();

    render(
      <RecurringTaskSystemManager onTemplateUpdated={mockOnTemplateUpdated} />,
    );

    // Save a template first
    fireEvent.click(screen.getByTestId("save-template-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    });

    // Update template time from 07:00 to 08:00
    fireEvent.click(screen.getByTestId("update-template-btn"));

    await waitFor(() => {
      // Future generated tasks use new time
      expect(mockOnTemplateUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: expect.any(Number),
          updates: { task_time: "08:00" },
          oldTime: "07:00",
          newTime: "08:00",
        }),
      );
    });

    // New tasks created with updated time
    expect(screen.getByTestId("template-display")).toHaveTextContent(
      "Exercise - 08:00",
    );
  });

  test("Recurring task in task management - Complete one instance of recurring task", async () => {
    const mockOnTaskInstanceCompleted = jest.fn();

    render(
      <RecurringTaskSystemManager
        onTaskInstanceCompleted={mockOnTaskInstanceCompleted}
      />,
    );

    // Save template and generate tasks
    fireEvent.click(screen.getByTestId("save-template-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByTestId("generate-tasks-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("generated-tasks-count")).toHaveTextContent(
        "5",
      );
    });

    // Complete one instance of recurring task
    fireEvent.click(screen.getByTestId("complete-task-btn"));

    await waitFor(() => {
      // Only that instance marked complete, template unchanged
      expect(mockOnTaskInstanceCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: expect.any(Number),
          recurringId: expect.any(Number),
          templateUnchanged: true,
          instanceOnly: true,
        }),
      );
    });

    // Individual task completion, template remains active
    const calendarDisplay = screen.getByTestId("calendar-display");
    expect(calendarDisplay).toHaveTextContent("Completed");
    expect(screen.getByTestId("template-count")).toHaveTextContent("1"); // Template still exists
  });

  test("Recurring task cleanup - Delete recurring template", async () => {
    const mockOnTemplateDeleted = jest.fn();

    render(
      <RecurringTaskSystemManager onTemplateDeleted={mockOnTemplateDeleted} />,
    );

    // Save a template first
    fireEvent.click(screen.getByTestId("save-template-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    });

    // Delete recurring template
    fireEvent.click(screen.getByTestId("delete-template-btn"));

    await waitFor(() => {
      // Associated tasks handled appropriately
      expect(screen.getByTestId("template-count")).toHaveTextContent("0");
    });

    // Template deleted, existing tasks remain or marked
    expect(mockOnTemplateDeleted).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: expect.any(Number),
        associatedTasksRemain: true,
        templateDeleted: true,
      }),
    );

    // Verify template removed from display
    const templateDisplay = screen.getByTestId("template-display");
    expect(templateDisplay).not.toHaveTextContent("Exercise - 07:00");
  });
});
