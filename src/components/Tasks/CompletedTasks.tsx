import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, endOfWeek } from "date-fns";
import { useData } from "../../context/DataContext";
import type { Task } from "../../api/Task";
import "./CompletedTasks.css";

const CompletedTasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const dateFromUrl = query.get('date') || "";
  
  const { 
    taskCache, 
    currentWeekId, 
    fetchWeekData, 
    loading: dataLoading 
  } = useData();
  
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(dateFromUrl);
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [totalCompleted, setTotalCompleted] = useState(0);
  
  // Ensure we have the current week's data loaded
  useEffect(() => {
    const loadWeekData = async () => {
      setLoading(true);
      try {
        // Fetch current week data if needed
        await fetchWeekData(currentWeekId);
        
        // Add loading buffer time to prevent flickering
        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (err) {
        console.error("Error loading week data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadWeekData();
  }, [fetchWeekData, currentWeekId]);
  
  // Process and group completed tasks from this week
  useEffect(() => {
    if (!currentWeekId || !taskCache[currentWeekId]) return;
    
    const processCompletedTasks = () => {
      try {
        // Get all completed tasks for the current week
        const weekData = taskCache[currentWeekId];
        const allCompletedTasks: Task[] = [];
        
        // Collect all completed tasks
        Object.values(weekData).forEach(tasksForDate => {
          const completedForDate = tasksForDate.filter(task => 
            task.completed && (filterDate ? task.date === filterDate : true)
          );
          
          if (completedForDate.length > 0) {
            allCompletedTasks.push(...completedForDate);
          }
        });
        
        // Group by date
        const byDate: Record<string, Task[]> = {};
        allCompletedTasks.forEach(task => {
          if (!byDate[task.date]) {
            byDate[task.date] = [];
          }
          byDate[task.date].push(task);
        });
        
        // Sort dates in descending order
        const sortedGrouped: Record<string, Task[]> = {};
        Object.keys(byDate)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .forEach(date => {
            sortedGrouped[date] = byDate[date];
          });
        
        setGroupedTasks(sortedGrouped);
        setTotalCompleted(allCompletedTasks.length);
      } catch (error) {
        console.error("Error processing completed tasks:", error);
      }
    };
    
    processCompletedTasks();
  }, [taskCache, currentWeekId, filterDate]);
  
  // Get week range display for UI
  const getWeekRangeDisplay = useCallback(() => {
    if (!currentWeekId) return "";
    
    const weekStart = new Date(currentWeekId);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  }, [currentWeekId]);
  
  // Format date for headers
  const formatDateHeader = useCallback((dateStr: string) => {
    return format(new Date(dateStr), "EEEE, MMMM d, yyyy");
  }, []);
  
  return (
    <div className="completed-tasks-container">
      <div className="completed-tasks-header">
        <h1>Completed Tasks</h1>
        <div className="completed-tasks-actions">
          <button
            className="back-button"
            onClick={() => navigate(-1)}
          >
            <span>←</span> Back
          </button>
          
          <div className="date-filter">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="date-input"
              placeholder="Filter by date"
            />
            {filterDate && (
              <button 
                className="clear-filter"
                onClick={() => setFilterDate("")}
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Week range display */}
      <div className="week-range">
        <span>This Week: {getWeekRangeDisplay()}</span>
      </div>
      
      {loading || dataLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading completed tasks...</p>
        </div>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <h2>No completed tasks</h2>
          
          {filterDate ? (
            <p>No completed tasks found for {format(new Date(filterDate), 'PPP')}.</p>
          ) : (
            <p>No completed tasks this week. Tasks you complete will appear here.</p>
          )}
          
          <button 
            className="action-button"
            onClick={() => navigate("/calendar/day")}
          >
            Go to tasks
          </button>
        </div>
      ) : (
        <div className="completed-tasks-list">
          <div className="task-count">
            {totalCompleted} completed task{totalCompleted !== 1 ? 's' : ''} found
          </div>
          
          {Object.entries(groupedTasks).map(([date, tasks]) => (
            <div key={date} className="date-group">
              <h3 className="date-header">{formatDateHeader(date)}</h3>
              <ul className="task-group">
                {tasks.map(task => (
                  <li key={task.id} className="completed-task-item">
                    <div className="task-status completed">
                      ✓
                    </div>
                    <div className="task-content">
                      <div className="task-text">{task.text}</div>
                      <div className="task-meta">
                        {task.time && (
                          <span className="task-time">{task.time}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletedTasks;