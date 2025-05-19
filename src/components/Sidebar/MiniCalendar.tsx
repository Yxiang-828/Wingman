import React from "react";
import Calendar from "react-calendar";
import { isSameDay } from "date-fns";
import "./MiniCalendar.css";

interface MiniCalendarProps {
  events?: Array<{
    date: Date;
    count: number;
  }>;
  onDateSelect?: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  events = [],
  onDateSelect,
}) => {
  return (
    <div className="px-4 mb-4">
      <Calendar
        onClickDay={onDateSelect}
        className="react-calendar--small"
        tileClassName={({ date }) => {
          const hasEvent = events.some((e) => isSameDay(e.date, date));
          const today = new Date();
          const isToday =
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();

          let classes = "";
          if (hasEvent) classes += " has-event";
          if (isToday) classes += " today-highlight";
          return classes.trim();
        }}
      />
    </div>
  );
};

export default MiniCalendar;
