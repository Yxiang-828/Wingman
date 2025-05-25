import React from "react";
import "./Calendar.css";

export interface TimeBlock {
  id: number;
  start: string; // e.g. "09:00"
  end: string;   // e.g. "10:30"
  label: string;
  color?: string;
}

interface Props {
  blocks: TimeBlock[];
}

const TimeBlockVisualizer: React.FC<Props> = ({ blocks }) => (
  <div className="timeblock-visualizer">
    {blocks.map(block => (
      <div
        key={block.id}
        className="timeblock"
        style={{ background: block.color || "#646cff" }}
        title={`${block.label} (${block.start} - ${block.end})`}
      >
        <span>{block.label}</span>
        <span className="timeblock-time">{block.start} - {block.end}</span>
      </div>
    ))}
  </div>
);

export default TimeBlockVisualizer;