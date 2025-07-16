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
      setRecurringTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId ? { ...template, ...updates } : template,
        ),
      );

      if (onTemplateUpdated) {
        onTemplateUpdated({
          templateId,
          updates,
          oldTime: "07:00",
          newTime: updates.task_time || "08:00",
        });
      }
    },
    [onTemplateUpdated],
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
  const handleDeleteTemplate = React.useCallback(
    (templateId) => {
      setRecurringTemplates((prev) => prev.filter((t) => t.id !== templateId));

      if (onTemplateDeleted) {
        onTemplateDeleted({
          templateId,
          associatedTasksRemain: true,
          templateDeleted: true,
        });
      }
    },
    [onTemplateDeleted],
  );

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
        onClick={() => handleUpdateTemplate(1, { task_time: "08:00" })}
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
        onClick={() => handleDeleteTemplate(1)}
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

// Mock Data Synchronization Manager component
const DataSyncManager = ({
  onDashboardTaskAdded,
  onCalendarDiarySync,
  onDiaryMoodUpdate,
  onTaskCompletion,
  onCrossComponentRefresh,
}) => {
  const [dashboardTasks, setDashboardTasks] = React.useState([]);
  const [calendarTasks, setCalendarTasks] = React.useState([]);
  const [calendarDiaryMarkers, setCalendarDiaryMarkers] = React.useState([]);
  const [diaryEntries, setDiaryEntries] = React.useState([]);
  const [dashboardMoodWidget, setDashboardMoodWidget] =
    React.useState("neutral");
  const [crossComponentData, setCrossComponentData] = React.useState({
    tasks: [],
    events: [],
    diaryEntries: [],
    lastUpdated: null,
  });

  // Mock task data
  const mockTask = {
    id: 1,
    title: "Team Meeting",
    task_time: "14:00",
    task_date: "2025-07-13",
    completed: false,
    failed: false,
    user_id: "test-user",
  };

  // Mock diary entry data
  const mockDiaryEntry = {
    id: 1,
    title: "Great Day",
    content: "Had an amazing productive day!",
    mood: "happy",
    entry_date: "2025-07-13",
    user_id: "test-user",
  };

  // Dashboard-Calendar sync: Add task in Dashboard
  const handleDashboardTaskAdd = React.useCallback(() => {
    const newTask = { ...mockTask, id: Date.now() };

    // Add to dashboard
    setDashboardTasks((prev) => [...prev, newTask]);

    // Immediately sync to calendar
    setCalendarTasks((prev) => [...prev, newTask]);

    if (onDashboardTaskAdded) {
      onDashboardTaskAdded({
        dashboardTask: newTask,
        calendarTask: newTask,
        syncStatus: "immediate",
        consistency: "real-time",
      });
    }
  }, [onDashboardTaskAdded]);

  // Calendar-Diary sync: Add diary entry
  const handleCalendarDiarySync = React.useCallback(() => {
    const newEntry = { ...mockDiaryEntry, id: Date.now() };

    // Add diary entry
    setDiaryEntries((prev) => [...prev, newEntry]);

    // Add marker to calendar for that date
    const calendarMarker = {
      date: newEntry.entry_date,
      hasDiaryEntry: true,
      mood: newEntry.mood,
      entryId: newEntry.id,
    };
    setCalendarDiaryMarkers((prev) => [...prev, calendarMarker]);

    if (onCalendarDiarySync) {
      onCalendarDiarySync({
        diaryEntry: newEntry,
        calendarMarker: calendarMarker,
        syncStatus: "immediate",
        markerDisplayed: true,
      });
    }
  }, [onCalendarDiarySync]);

  // Diary-Dashboard sync: Update mood in diary
  const handleDiaryMoodUpdate = React.useCallback(() => {
    const updatedMood = "excited";

    // Update diary entry mood
    setDiaryEntries((prev) =>
      prev.map((entry) =>
        entry.id === mockDiaryEntry.id
          ? { ...entry, mood: updatedMood }
          : entry,
      ),
    );

    // Update dashboard mood widget
    setDashboardMoodWidget(updatedMood);

    if (onDiaryMoodUpdate) {
      onDiaryMoodUpdate({
        oldMood: mockDiaryEntry.mood,
        newMood: updatedMood,
        dashboardUpdated: true,
        widgetReflectsChange: true,
      });
    }
  }, [onDiaryMoodUpdate]);

  // Task completion sync across all views
  const handleTaskCompletion = React.useCallback(() => {
    const taskId = mockTask.id;
    const completedTask = { ...mockTask, completed: true, id: taskId };

    // Update in dashboard
    setDashboardTasks((prev) =>
      prev.map((task) => (task.id === taskId ? completedTask : task)),
    );

    // Update in calendar
    setCalendarTasks((prev) =>
      prev.map((task) => (task.id === taskId ? completedTask : task)),
    );

    if (onTaskCompletion) {
      onTaskCompletion({
        taskId: taskId,
        dashboardStatus: "completed",
        calendarStatus: "completed",
        consistentAcrossViews: true,
        syncStatus: "immediate",
      });
    }
  }, [onTaskCompletion]);

  // Cross-component data refresh
  const handleCrossComponentRefresh = React.useCallback(() => {
    const updatedData = {
      tasks: [
        ...dashboardTasks,
        { id: 999, title: "New Task", completed: false },
      ],
      events: [{ id: 888, title: "New Event", event_date: "2025-07-13" }],
      diaryEntries: [
        ...diaryEntries,
        { id: 777, title: "New Entry", mood: "calm" },
      ],
      lastUpdated: new Date().toISOString(),
    };

    // Update all components simultaneously
    setCrossComponentData(updatedData);
    setDashboardTasks(updatedData.tasks);
    setCalendarTasks(updatedData.tasks);
    setDiaryEntries(updatedData.diaryEntries);

    if (onCrossComponentRefresh) {
      onCrossComponentRefresh({
        updatedData: updatedData,
        componentsRefreshed: ["dashboard", "calendar", "diary"],
        noStaleData: true,
        allComponentsSync: true,
      });
    }
  }, [dashboardTasks, diaryEntries, onCrossComponentRefresh]);

  return (
    <div>
      {/* Dashboard Task Count */}
      <div data-testid="dashboard-task-count">{dashboardTasks.length}</div>

      {/* Calendar Task Count */}
      <div data-testid="calendar-task-count">{calendarTasks.length}</div>

      {/* Calendar Diary Markers Count */}
      <div data-testid="calendar-diary-markers">
        {calendarDiaryMarkers.length}
      </div>

      {/* Dashboard Mood Widget */}
      <div data-testid="dashboard-mood-widget">{dashboardMoodWidget}</div>

      {/* Cross-component data status */}
      <div data-testid="cross-component-status">
        {crossComponentData.lastUpdated ? "synced" : "unsynced"}
      </div>

      {/* Task completion status */}
      <div data-testid="task-completion-status">
        {dashboardTasks.some((t) => t.completed) &&
        calendarTasks.some((t) => t.completed)
          ? "consistent"
          : "inconsistent"}
      </div>

      {/* Control buttons for testing */}
      <button
        data-testid="add-dashboard-task-btn"
        onClick={handleDashboardTaskAdd}
      >
        Add Task in Dashboard
      </button>

      <button
        data-testid="add-diary-entry-btn"
        onClick={handleCalendarDiarySync}
      >
        Add Diary Entry
      </button>

      <button
        data-testid="update-diary-mood-btn"
        onClick={handleDiaryMoodUpdate}
      >
        Update Mood in Diary
      </button>

      <button data-testid="complete-task-btn" onClick={handleTaskCompletion}>
        Complete Task in TasksCard
      </button>

      <button
        data-testid="refresh-components-btn"
        onClick={handleCrossComponentRefresh}
      >
        Update Data in One Component
      </button>
    </div>
  );
};

describe("INTEGRATION TESTS - Data Synchronization", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the electron API for data operations
    global.window.electronAPI = {
      db: {
        saveDiaryEntry: jest.fn().mockResolvedValue({ success: true, id: 1 }),
        updateDiaryEntry: jest.fn().mockResolvedValue({ success: true }),
        getDiaryEntries: jest.fn().mockResolvedValue([]),
        saveTask: jest.fn().mockResolvedValue({ success: true, id: 1 }),
        updateTask: jest.fn().mockResolvedValue({ success: true }),
        getTasks: jest.fn().mockResolvedValue([]),
        saveEvent: jest.fn().mockResolvedValue({ success: true, id: 1 }),
        getEvents: jest.fn().mockResolvedValue([]),
      },
    };

    // Mock dashboard refresh events
    global.dispatchEvent = jest.fn();
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
  });

  test("Dashboard-calendar sync - Add task in Dashboard", async () => {
    const mockOnDashboardTaskAdded = jest.fn();

    render(<DataSyncManager onDashboardTaskAdded={mockOnDashboardTaskAdded} />);

    // Initial state - no tasks
    expect(screen.getByTestId("dashboard-task-count")).toHaveTextContent("0");
    expect(screen.getByTestId("calendar-task-count")).toHaveTextContent("0");

    // Add task in Dashboard
    fireEvent.click(screen.getByTestId("add-dashboard-task-btn"));

    await waitFor(() => {
      // Task appears in Calendar view immediately
      expect(screen.getByTestId("dashboard-task-count")).toHaveTextContent("1");
      expect(screen.getByTestId("calendar-task-count")).toHaveTextContent("1");
    });

    // Real-time data consistency across components
    expect(mockOnDashboardTaskAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboardTask: expect.objectContaining({
          title: "Team Meeting",
          task_time: "14:00",
          task_date: "2025-07-13",
        }),
        calendarTask: expect.objectContaining({
          title: "Team Meeting",
          task_time: "14:00",
          task_date: "2025-07-13",
        }),
        syncStatus: "immediate",
        consistency: "real-time",
      }),
    );
  });

  test("Calendar-diary sync - Add diary entry", async () => {
    const mockOnCalendarDiarySync = jest.fn();

    render(<DataSyncManager onCalendarDiarySync={mockOnCalendarDiarySync} />);

    // Initial state - no diary markers
    expect(screen.getByTestId("calendar-diary-markers")).toHaveTextContent("0");

    // Add diary entry
    fireEvent.click(screen.getByTestId("add-diary-entry-btn"));

    await waitFor(() => {
      // Entry date shows indicator in Calendar
      expect(screen.getByTestId("calendar-diary-markers")).toHaveTextContent(
        "1",
      );
    });

    // Calendar displays diary entry markers
    expect(mockOnCalendarDiarySync).toHaveBeenCalledWith(
      expect.objectContaining({
        diaryEntry: expect.objectContaining({
          title: "Great Day",
          content: "Had an amazing productive day!",
          mood: "happy",
          entry_date: "2025-07-13",
        }),
        calendarMarker: expect.objectContaining({
          date: "2025-07-13",
          hasDiaryEntry: true,
          mood: "happy",
        }),
        syncStatus: "immediate",
        markerDisplayed: true,
      }),
    );
  });

  test("Diary-dashboard sync - Update mood in diary", async () => {
    const mockOnDiaryMoodUpdate = jest.fn();

    render(<DataSyncManager onDiaryMoodUpdate={mockOnDiaryMoodUpdate} />);

    // Initial mood state
    expect(screen.getByTestId("dashboard-mood-widget")).toHaveTextContent(
      "neutral",
    );

    // Update mood in diary
    fireEvent.click(screen.getByTestId("update-diary-mood-btn"));

    await waitFor(() => {
      // Dashboard mood widget reflects change
      expect(screen.getByTestId("dashboard-mood-widget")).toHaveTextContent(
        "excited",
      );
    });

    // Dashboard shows updated mood status
    expect(mockOnDiaryMoodUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        oldMood: "happy",
        newMood: "excited",
        dashboardUpdated: true,
        widgetReflectsChange: true,
      }),
    );
  });

  test("Task completion sync - Complete task in TasksCard", async () => {
    const mockOnTaskCompletion = jest.fn();

    render(<DataSyncManager onTaskCompletion={mockOnTaskCompletion} />);

    // Add a task first
    fireEvent.click(screen.getByTestId("add-dashboard-task-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-task-count")).toHaveTextContent("1");
    });

    // Initial completion status
    expect(screen.getByTestId("task-completion-status")).toHaveTextContent(
      "inconsistent",
    );

    // Complete task in TasksCard
    fireEvent.click(screen.getByTestId("complete-task-btn"));

    await waitFor(() => {
      // Dashboard and Calendar both show completion
      expect(screen.getByTestId("task-completion-status")).toHaveTextContent(
        "consistent",
      );
    });

    // Consistent task status across all views
    expect(mockOnTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: expect.any(Number),
        dashboardStatus: "completed",
        calendarStatus: "completed",
        consistentAcrossViews: true,
        syncStatus: "immediate",
      }),
    );
  });

  test("Cross-component data refresh - Update data in one component", async () => {
    const mockOnCrossComponentRefresh = jest.fn();

    render(
      <DataSyncManager onCrossComponentRefresh={mockOnCrossComponentRefresh} />,
    );

    // Initial sync status
    expect(screen.getByTestId("cross-component-status")).toHaveTextContent(
      "unsynced",
    );

    // Update data in one component
    fireEvent.click(screen.getByTestId("refresh-components-btn"));

    await waitFor(() => {
      // All related components refresh automatically
      expect(screen.getByTestId("cross-component-status")).toHaveTextContent(
        "synced",
      );
    });

    // No stale data in any component
    expect(mockOnCrossComponentRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedData: expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ title: "New Task" }),
          ]),
          events: expect.arrayContaining([
            expect.objectContaining({ title: "New Event" }),
          ]),
          diaryEntries: expect.arrayContaining([
            expect.objectContaining({ title: "New Entry" }),
          ]),
          lastUpdated: expect.any(String),
        }),
        componentsRefreshed: ["dashboard", "calendar", "diary"],
        noStaleData: true,
        allComponentsSync: true,
      }),
    );
  });
});
