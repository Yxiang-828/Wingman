import React, { useState, useEffect, useRef } from "react";
import "./TimeInput.css";

interface TimeInputProps {
  value: string;
  onChange: (formattedTime: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * TimeInput Component
 * Enhanced time picker with both manual input and interactive numpad
 * Supports 24-hour format with real-time validation and formatting
 * Features touch-friendly numpad for mobile devices
 */
const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  placeholder = "Enter time (HH:MM)",
  className = "",
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [showNumpad, setShowNumpad] = useState(false);
  const numpadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Synchronizes internal state with external value prop
   * Ensures component stays in sync with parent state changes
   */
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  /**
   * Handles click outside numpad to close it
   * Excludes clicks on the toggle button to prevent immediate reopening
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        numpadRef.current &&
        !numpadRef.current.contains(event.target as Node) &&
        iconButtonRef.current &&
        !iconButtonRef.current.contains(event.target as Node)
      ) {
        setShowNumpad(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handles manual input with real-time validation and formatting
   * Restricts input to valid time format and enforces 24-hour constraints
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let filtered = "";
    const input = e.target.value;
    let digitCount = 0;

    // Process each character, allowing only digits and colon
    for (let i = 0; i < input.length && i < 5; i++) {
      const char = input[i];

      if (char === ":" && filtered.length === 2 && digitCount === 2) {
        filtered += ":";
      } else if (/[0-9]/.test(char) && digitCount < 4) {
        filtered += char;
        digitCount++;
      }
    }

    // Auto-format: add colon after 2 digits
    if (/^\d{2}$/.test(filtered)) {
      filtered = filtered + ":";
    }

    // Validate and enforce time constraints
    if (/^\d{4}$/.test(filtered)) {
      const hours = parseInt(filtered.substring(0, 2));
      const minutes = parseInt(filtered.substring(2, 4));

      // Enforce valid hour and minute ranges
      if (hours > 23) filtered = "23" + filtered.substring(2);
      if (minutes > 59) filtered = filtered.substring(0, 2) + "59";

      // Auto-format to HH:MM
      filtered = filtered.substring(0, 2) + ":" + filtered.substring(2, 4);
    } else if (/^\d{2}:\d{2}$/.test(filtered)) {
      const hours = parseInt(filtered.substring(0, 2));
      const minutes = parseInt(filtered.substring(3, 5));

      // Enforce valid ranges for complete time
      if (hours > 23) filtered = "23" + filtered.substring(2);
      if (minutes > 59) filtered = filtered.substring(0, 3) + "59";
    }

    setInputValue(filtered);

    // Trigger onChange for complete time entries
    if (/^\d{4}$/.test(filtered) || /^\d{2}:\d{2}$/.test(filtered)) {
      formatAndValidateTime(filtered);
    }
  };

  /**
   * Validates and formats time input for parent component
   * Ensures only valid 24-hour format times are propagated
   */
  const formatAndValidateTime = (rawInput: string) => {
    let formattedTime = "";

    // Handle HHMM format
    if (/^\d{4}$/.test(rawInput)) {
      const hours = parseInt(rawInput.substring(0, 2));
      const minutes = parseInt(rawInput.substring(2, 4));

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
      }
    }
    // Handle HH:MM format
    else if (/^\d{2}:\d{2}$/.test(rawInput)) {
      const [hours, minutes] = rawInput.split(":").map(Number);

      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
      }
    }

    if (formattedTime) {
      onChange(formattedTime);
    }
  };

  /**
   * Handles numpad button interactions
   * Supports number input, special commands, and minute presets
   */
  const handleNumpadClick = (value: string) => {
    if (value === "clear") {
      setInputValue("");
      onChange("");
      return;
    }

    if (value === "backspace") {
      if (inputValue.length > 0) {
        const newValue = inputValue.slice(0, -1);
        setInputValue(newValue);
      }
      return;
    }

    if (value === "done") {
      handleBlur();
      setShowNumpad(false);
      return;
    }

    // Handle minute preset selections
    if (value.startsWith("min")) {
      const minuteValue = value.substring(3);
      const newValue =
        inputValue.length < 2
          ? "00" + minuteValue
          : inputValue.substring(0, 2) + minuteValue;

      setInputValue(newValue);
      formatAndValidateTime(newValue);
      return;
    }

    // Handle individual digit input
    if (/^\d$/.test(value)) {
      let newValue = inputValue;

      // Add digits respecting format constraints
      if (inputValue.includes(":")) {
        if (inputValue.length < 5) {
          newValue += value;
        }
      } else {
        if (inputValue.length < 4) {
          newValue += value;
        }
      }

      setInputValue(newValue);

      // Auto-validate complete time entries
      if (
        (newValue.includes(":") && newValue.length === 5) ||
        (!newValue.includes(":") && newValue.length === 4)
      ) {
        formatAndValidateTime(newValue);
      }
    }
  };

  /**
   * Handles input blur with auto-completion
   * Automatically completes partial time entries
   */
  const handleBlur = () => {
    if (/^\d{4}$/.test(inputValue)) {
      const hours = inputValue.substring(0, 2);
      const minutes = inputValue.substring(2, 4);
      const formatted = `${hours}:${minutes}`;
      setInputValue(formatted);
      formatAndValidateTime(inputValue);
    } else if (/^\d{1,2}$/.test(inputValue)) {
      // Auto-complete with :00 for hour-only entries
      const hours = inputValue.padStart(2, "0");
      const formatted = `${hours}:00`;
      setInputValue(formatted);
      onChange(formatted);
    }
  };

  /**
   * Generates minute preset buttons in 5-minute intervals
   * Provides quick selection for common minute values
   */
  const generateMinutePresets = () => {
    const presets = [];
    for (let i = 0; i < 60; i += 5) {
      presets.push(
        <button
          key={`min${i}`}
          className="time-minute-btn"
          onClick={() =>
            handleNumpadClick(`min${i.toString().padStart(2, "0")}`)
          }
        >
          :{i.toString().padStart(2, "0")}
        </button>
      );
    }
    return presets;
  };

  /**
   * Toggles numpad visibility with event propagation control
   */
  const toggleNumpad = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNumpad(!showNumpad);
  };

  return (
    <div className="time-input-container">
      <input
        ref={inputRef}
        type="text"
        className={`time-input ${className}`}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={5}
        aria-label="Time input field"
      />
      <button
        ref={iconButtonRef}
        type="button"
        className="time-input-toggle"
        onClick={toggleNumpad}
        aria-label="Toggle time picker"
        aria-expanded={showNumpad}
      >
        <span className="time-icon">🕒</span>
      </button>

      {showNumpad && (
        <div
          ref={numpadRef}
          className="time-numpad"
          role="dialog"
          aria-label="Time picker"
        >
          <div className="time-numpad-header">
            <div className="time-numpad-title">Select Time</div>
            <div className="time-numpad-value">{inputValue || "00:00"}</div>
            <button
              className="time-numpad-close"
              onClick={() => setShowNumpad(false)}
              aria-label="Close time picker"
            >
              ×
            </button>
          </div>

          {/* Number input grid */}
          <div className="time-numpad-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className="time-numpad-button"
                onClick={() => handleNumpadClick(num.toString())}
              >
                {num}
              </button>
            ))}
            <button
              className="time-numpad-button"
              onClick={() => handleNumpadClick("clear")}
            >
              C
            </button>
            <button
              className="time-numpad-button"
              onClick={() => handleNumpadClick("0")}
            >
              0
            </button>
            <button
              className="time-numpad-button"
              onClick={() => handleNumpadClick("backspace")}
            >
              ←
            </button>
          </div>

          {/* Minute presets for quick selection */}
          <div className="time-section-label">Quick Minutes</div>
          <div className="time-minute-grid">{generateMinutePresets()}</div>

          {/* Action buttons */}
          <div className="time-numpad-actions">
            <button
              className="time-numpad-action-btn"
              onClick={() => handleNumpadClick("done")}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeInput;
