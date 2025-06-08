import React, { useState, useEffect, useCallback } from "react";
import "./Dashboard.css";

interface TimeSession {
  id: string;
  taskTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  isActive: boolean;
}

/**
 * TimeTracker Component - Your Wingman's Productivity Monitor
 * Tracks time spent on tasks with session management and statistics
 * Your digital timekeeper ensuring every minute counts
 */
const TimeTracker: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);

  /**
   * Updates elapsed time for active session
   * Your Wingman counts every precious second of productivity
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentSession && currentSession.isActive) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession]);

  /**
   * Starts a new time tracking session
   * Your Wingman begins monitoring your focused work
   */
  const startSession = useCallback(() => {
    if (!taskTitle.trim()) return;

    const newSession: TimeSession = {
      id: Date.now().toString(),
      taskTitle: taskTitle.trim(),
      startTime: new Date(),
      duration: 0,
      isActive: true,
    };

    setCurrentSession(newSession);
    setElapsedTime(0);
    console.log("Wingman: Time tracking session started for:", taskTitle);
  }, [taskTitle]);

  /**
   * Stops the current tracking session
   * Your Wingman records the completed work session
   */
  const stopSession = useCallback(() => {
    if (!currentSession) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 1000);

    const completedSession: TimeSession = {
      ...currentSession,
      endTime,
      duration,
      isActive: false,
    };

    setSessions(prev => [completedSession, ...prev]);
    setCurrentSession(null);
    setElapsedTime(0);
    setTaskTitle("");
    
    console.log("Wingman: Time tracking session completed:", duration, "seconds");
  }, [currentSession]);

  /**
   * Formats seconds into readable time format
   * Your Wingman presents time in warrior-friendly format
   */
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTodaysSessions = () => {
    const today = new Date().toDateString();
    return sessions.filter(session => 
      session.startTime.toDateString() === today
    );
  };

  const getTotalTimeToday = () => {
    return getTodaysSessions().reduce((total, session) => total + session.duration, 0);
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <h2>Time Tracker</h2>
      </div>

      <div className="dashboard-card-content">
        {!currentSession ? (
          <div className="time-tracker-start">
            <input
              type="text"
              placeholder="What mission are you focusing on, boss?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="task-title-input"
              onKeyPress={(e) => e.key === 'Enter' && startSession()}
            />
            <button
              onClick={startSession}
              disabled={!taskTitle.trim()}
              className="action-btn"
            >
              Start Tracking
            </button>
          </div>
        ) : (
          <div className="time-tracker-active">
            <div className="current-session">
              <h3>{currentSession.taskTitle}</h3>
              <div className="elapsed-time">{formatTime(elapsedTime)}</div>
              <button onClick={stopSession} className="action-btn">
                Stop Session
              </button>
            </div>
          </div>
        )}

        <div className="time-stats">
          <div className="stat-item">
            <span className="stat-number">{getTodaysSessions().length}</span>
            <span className="stat-label">Sessions Today</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{formatTime(getTotalTimeToday())}</span>
            <span className="stat-label">Total Time</span>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="recent-sessions">
            <h4>Recent Sessions</h4>
            <div className="dashboard-list">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="dashboard-item">
                  <div className="item-content">
                    <div className="item-title">{session.taskTitle}</div>
                    <div className="item-meta">
                      <span>{formatTime(session.duration)}</span>
                      <span>{session.startTime.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;