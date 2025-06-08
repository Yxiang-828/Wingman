import React from "react";
import "./Calendar.css";

/**
 * TimeBlock interface for representing scheduled time periods
 * Used for visualizing calendar events and task time blocks
 */
export interface TimeBlock {
  id: number;
  start: string; // Time in HH:MM format (e.g., "09:00")
  end: string; // Time in HH:MM format (e.g., "10:30")
  label: string; // Display name for the time block
  color?: string; // Optional custom color (defaults to theme accent)
}

interface Props {
  blocks: TimeBlock[];
}

/**
 * TimeBlockVisualizer Component
 * Renders a visual timeline of scheduled time blocks
 * Provides hover tooltips with detailed time information
 * Supports custom colors for different block types
 */
const TimeBlockVisualizer: React.FC<Props> = ({ blocks }) => (
  <div className="timeblock-visualizer">
    {blocks.map((block) => (
      <div
        key={block.id}
        className="timeblock"
        style={{
          background: block.color || "var(--calendar-accent, #646cff)",
          // Ensure accessibility with sufficient contrast
          color: block.color ? "white" : "inherit",
        }}
        title={`${block.label} (${block.start} - ${block.end})`}
        role="button"
        tabIndex={0}
        aria-label={`Time block: ${block.label} from ${block.start} to ${block.end}`}
      >
        <span className="timeblock-label">{block.label}</span>
        <span className="timeblock-time">
          {block.start} - {block.end}
        </span>
      </div>
    ))}
  </div>
);

export default TimeBlockVisualizer;
