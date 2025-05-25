import React, { useState, useEffect, useRef } from "react";
import "./TimeInput.css";

interface TimeInputProps {
  value: string;
  onChange: (formattedTime: string) => void;
  placeholder?: string;
  className?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  placeholder = "24h time (HH:MM)", // Updated placeholder text
  className = "",
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [showNumpad, setShowNumpad] = useState(false);
  const numpadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if click is outside numpad AND outside the icon button
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and colon
    let filtered = "";
    const input = e.target.value;

    for (let i = 0; i < input.length && i < 5; i++) {
      const char = input[i];
      if (char === ":" && filtered.length === 2) {
        filtered += ":";
      } else if (/[0-9]/.test(char)) {
        filtered += char;
      }
    }

    // Validate hours (0-23) and minutes (0-59)
    if (/^\d{4}$/.test(filtered)) {
      const hours = parseInt(filtered.substring(0, 2));
      const minutes = parseInt(filtered.substring(2, 4));

      // Enforce valid ranges
      if (hours > 23) filtered = "23" + filtered.substring(2);
      if (minutes > 59) filtered = filtered.substring(0, 2) + "59";
    } else if (/^\d{2}:\d{2}$/.test(filtered)) {
      const hours = parseInt(filtered.substring(0, 2));
      const minutes = parseInt(filtered.substring(3, 5));

      // Enforce valid ranges
      if (hours > 23) filtered = "23" + filtered.substring(2);
      if (minutes > 59) filtered = filtered.substring(0, 3) + "59";
    }

    setInputValue(filtered);

    // Format and validate if we have all 4 digits
    if (/^\d{4}$/.test(filtered) || /^\d{2}:\d{2}$/.test(filtered)) {
      formatAndValidateTime(filtered);
    }
  };

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

    // Handle 5-minute interval selections
    if (value.startsWith("min")) {
      const minuteValue = value.substring(3);

      // Format and validate after selecting minutes
      const newValue =
        inputValue.length < 2
          ? "00" + minuteValue
          : inputValue.substring(0, 2) + minuteValue;

      setInputValue(newValue);
      formatAndValidateTime(newValue);
      return;
    }

    // Handle number input
    if (/^\d$/.test(value)) {
      let newValue = inputValue;

      // Only add digits if we have less than 4 characters (or 5 with colon)
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

      // Format and validate if we have enough digits
      if (
        (newValue.includes(":") && newValue.length === 5) ||
        (!newValue.includes(":") && newValue.length === 4)
      ) {
        formatAndValidateTime(newValue);
      }
    }
  };

  const handleBlur = () => {
    // Format on blur
    if (/^\d{4}$/.test(inputValue)) {
      const hours = inputValue.substring(0, 2);
      const minutes = inputValue.substring(2, 4);
      const formatted = `${hours}:${minutes}`;
      setInputValue(formatted);
      formatAndValidateTime(inputValue);
    } else if (/^\d{1,2}$/.test(inputValue)) {
      // If only hours were entered, add zeros for minutes
      const hours = inputValue.padStart(2, "0");
      const formatted = `${hours}:00`;
      setInputValue(formatted);
      onChange(formatted);
    }
  };

  // Generate minute preset buttons
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

  // Toggle numpad visibility
  const toggleNumpad = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNumpad(!showNumpad);
  };

  return (
    <div className="time-input-container" onClick={(e) => e.stopPropagation()}>
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
        onClick={(e) => e.stopPropagation()} // Prevent event bubbling
        onFocus={(e) => e.stopPropagation()} // Prevent event bubbling on focus
      />
      <button
        ref={iconButtonRef}
        type="button"
        className="time-input-toggle"
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          toggleNumpad(e);
        }}
        aria-label="Toggle time picker"
      >
        <span className="time-icon">🕒</span>
      </button>

      {showNumpad && (
        <div ref={numpadRef} className="time-numpad time-numpad-compact">
          <div className="time-numpad-header">
            <div className="time-numpad-title">Select Time</div>
            <div className="time-numpad-value">{inputValue || "00:00"}</div>
            <button
              className="time-numpad-close"
              onClick={() => setShowNumpad(false)}
            >
              ×
            </button>
          </div>

          <div className="time-numpad-grid">
            <button className="time-numpad-button" onClick={() => handleNumpadClick("1")}>1</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("2")}>2</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("3")}>3</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("4")}>4</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("5")}>5</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("6")}>6</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("7")}>7</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("8")}>8</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("9")}>9</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("clear")}>C</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("0")}>0</button>
            <button className="time-numpad-button" onClick={() => handleNumpadClick("backspace")}>←</button>
          </div>

          <div className="time-section-label">Common Minutes</div>
          <div className="time-minute-grid">{generateMinutePresets()}</div>

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
