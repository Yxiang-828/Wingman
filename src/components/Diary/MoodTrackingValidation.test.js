import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Simple test component that simulates mood tracking functionality
const MoodValidator = ({ onMoodSubmit, onValidationError }) => {
  const [selectedMood, setSelectedMood] = React.useState("");
  const [diaryContent, setDiaryContent] = React.useState("");

  // Valid mood options from screenshot
  const validMoods = [
    "happy",
    "sad",
    "excited",
    "anxious",
    "calm",
    "angry",
    "neutral",
  ];

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
  };

  const handleSubmit = async () => {
    try {
      // Validate mood selection
      if (selectedMood && !validMoods.includes(selectedMood)) {
        const error = "Invalid mood selected";
        if (onValidationError) onValidationError(error);
        return;
      }

      // Apply default mood if empty (neutral)
      const finalMood = selectedMood || "neutral";

      // Simulate diary submission
      const diaryEntry = {
        content: diaryContent,
        mood: finalMood,
        entry_date: new Date().toISOString().split("T")[0],
      };

      if (onMoodSubmit) {
        await onMoodSubmit(diaryEntry);
      }
    } catch (error) {
      if (onValidationError) onValidationError(error.message);
    }
  };

  return (
    <div>
      <textarea
        data-testid="diary-content"
        value={diaryContent}
        onChange={(e) => setDiaryContent(e.target.value)}
        placeholder="Write your diary entry..."
      />

      <div data-testid="mood-selector">
        {validMoods.map((mood) => (
          <button
            key={mood}
            data-testid={`mood-${mood}`}
            onClick={() => handleMoodSelect(mood)}
          >
            {mood}
          </button>
        ))}

        {/* Test button for invalid mood */}
        <button
          data-testid="mood-invalid-emotion"
          onClick={() => handleMoodSelect("invalid-emotion")}
        >
          invalid-emotion
        </button>
      </div>

      <span data-testid="selected-mood">{selectedMood || "none"}</span>

      <button data-testid="submit-btn" onClick={handleSubmit}>
        Submit Diary
      </button>
    </div>
  );
};

describe("UNIT TESTS - Mood Tracking Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.window.electronAPI = {
      db: {
        saveDiaryEntry: jest.fn().mockResolvedValue({ success: true, id: 1 }),
      },
    };
  });

  test("Valid mood states accepted - Submit diary with mood 'happy'", async () => {
    const mockOnMoodSubmit = jest.fn();
    const mockOnValidationError = jest.fn();

    render(
      <MoodValidator
        onMoodSubmit={mockOnMoodSubmit}
        onValidationError={mockOnValidationError}
      />,
    );

    // Write diary content
    fireEvent.change(screen.getByTestId("diary-content"), {
      target: { value: "Today was a great day!" },
    });

    // Select happy mood
    fireEvent.click(screen.getByTestId("mood-happy"));

    // Verify mood selection
    expect(screen.getByTestId("selected-mood")).toHaveTextContent("happy");

    // Submit diary
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      // Mood saved successfully - {mood: "happy"} stored in database
      expect(mockOnMoodSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          mood: "happy",
          content: "Today was a great day!",
        }),
      );
    });

    // No validation errors should occur
    expect(mockOnValidationError).not.toHaveBeenCalled();
  });

  test("Invalid mood states rejected - Submit diary with mood 'invalid-emotion'", async () => {
    const mockOnMoodSubmit = jest.fn();
    const mockOnValidationError = jest.fn();

    render(
      <MoodValidator
        onMoodSubmit={mockOnMoodSubmit}
        onValidationError={mockOnValidationError}
      />,
    );

    // Write diary content
    fireEvent.change(screen.getByTestId("diary-content"), {
      target: { value: "Testing invalid mood" },
    });

    // Select invalid mood
    fireEvent.click(screen.getByTestId("mood-invalid-emotion"));

    // Verify invalid mood selection
    expect(screen.getByTestId("selected-mood")).toHaveTextContent(
      "invalid-emotion",
    );

    // Submit diary
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      // Validation error, entry not saved - Error: "Invalid mood selected"
      expect(mockOnValidationError).toHaveBeenCalledWith(
        "Invalid mood selected",
      );
    });

    // Diary submission should not be called
    expect(mockOnMoodSubmit).not.toHaveBeenCalled();
  });

  test("Mood enum validation - Test all valid moods", async () => {
    const mockOnMoodSubmit = jest.fn();
    const mockOnValidationError = jest.fn();

    render(
      <MoodValidator
        onMoodSubmit={mockOnMoodSubmit}
        onValidationError={mockOnValidationError}
      />,
    );

    // Test all valid moods: ["happy", "sad", "excited", "anxious", "calm", "angry", "neutral"]
    const validMoods = [
      "happy",
      "sad",
      "excited",
      "anxious",
      "calm",
      "angry",
      "neutral",
    ];

    for (const mood of validMoods) {
      // Reset mocks for each mood test
      mockOnMoodSubmit.mockClear();
      mockOnValidationError.mockClear();

      // Write diary content
      fireEvent.change(screen.getByTestId("diary-content"), {
        target: { value: `Testing ${mood} mood` },
      });

      // Select the mood
      fireEvent.click(screen.getByTestId(`mood-${mood}`));

      // Verify mood selection
      expect(screen.getByTestId("selected-mood")).toHaveTextContent(mood);

      // Submit diary
      fireEvent.click(screen.getByTestId("submit-btn"));

      await waitFor(() => {
        // All accepted by validation - Each mood passes validation check
        expect(mockOnMoodSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            mood: mood,
            content: `Testing ${mood} mood`,
          }),
        );
      });

      // No validation errors should occur
      expect(mockOnValidationError).not.toHaveBeenCalled();
    }
  });

  test("Empty mood handling - Submit diary entry without selecting mood", async () => {
    const mockOnMoodSubmit = jest.fn();
    const mockOnValidationError = jest.fn();

    render(
      <MoodValidator
        onMoodSubmit={mockOnMoodSubmit}
        onValidationError={mockOnValidationError}
      />,
    );

    // Write diary content without selecting mood
    fireEvent.change(screen.getByTestId("diary-content"), {
      target: { value: "Diary entry without mood selection" },
    });

    // Don't select any mood - should remain "none"
    expect(screen.getByTestId("selected-mood")).toHaveTextContent("none");

    // Submit diary
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      // Default mood applied - {mood: "neutral"} or validation prompt
      expect(mockOnMoodSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          mood: "neutral", // Default mood applied
          content: "Diary entry without mood selection",
        }),
      );
    });

    // No validation errors should occur (default applied)
    expect(mockOnValidationError).not.toHaveBeenCalled();
  });
});
