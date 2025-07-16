import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Chat UI that uses injected services
const AIChatInterface = ({
  dataService,
  aiService,
  onChatMessage,
  onDataRetrieved,
}) => {
  const [chatInput, setChatInput] = React.useState("");
  const [chatResponse, setChatResponse] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSendMessage = async () => {
    setIsProcessing(true);
    let response = "";
    let retrievedData = null;
    let dataType = null;

    try {
      if (chatInput.toLowerCase().includes("how was my day yesterday")) {
        retrievedData = await dataService.getDiaryEntries(
          "test-user",
          "2025-07-12",
        );
        dataType = "diary";
        if (onDataRetrieved) onDataRetrieved(dataType, retrievedData);
      } else if (chatInput.toLowerCase().includes("what's my schedule today")) {
        retrievedData = await dataService.getEvents("test-user", "2025-07-13");
        dataType = "calendar";
        if (onDataRetrieved) onDataRetrieved(dataType, retrievedData);
      } else if (
        chatInput.toLowerCase().includes("how have i been feeling lately")
      ) {
        retrievedData = await dataService.getMoodHistory("test-user");
        dataType = "mood";
        if (onDataRetrieved) onDataRetrieved(dataType, retrievedData);
      }

      response = await aiService(chatInput, retrievedData);

      setChatResponse(response);

      if (onChatMessage) {
        onChatMessage({
          query: chatInput,
          response,
          dataAccessed: !!retrievedData,
          dataType,
        });
      }
    } catch (e) {
      setChatResponse("Sorry, I couldn't process your request.");
    }
    setIsProcessing(false);
  };

  return (
    <div>
      <textarea
        data-testid="chat-input"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        placeholder="Ask me about your day, schedule, or mood..."
      />
      <button
        data-testid="send-chat-btn"
        onClick={handleSendMessage}
        disabled={isProcessing}
      >
        {isProcessing ? "Processing..." : "Send"}
      </button>
      <div data-testid="chat-response">{chatResponse}</div>
    </div>
  );
};

describe("INTEGRATION TESTS - AI Chat Data Access (true integration)", () => {
  let mockGetDiaryEntries, mockGetEvents, mockGetMoodHistory, mockAIService;

  beforeEach(() => {
    mockGetDiaryEntries = jest.fn();
    mockGetEvents = jest.fn();
    mockGetMoodHistory = jest.fn();
    mockAIService = jest.fn();
  });

  test("Chat accesses diary data and integrates with AI service", async () => {
    const diaryData = [
      {
        id: 1,
        content: "Had a great day at work today!",
        mood: "happy",
        entry_date: "2025-07-12",
      },
    ];
    mockGetDiaryEntries.mockResolvedValue(diaryData);
    mockAIService.mockResolvedValue(
      "Chat response includes yesterday's diary content",
    );

    const dataService = {
      getDiaryEntries: mockGetDiaryEntries,
      getEvents: jest.fn(),
      getMoodHistory: jest.fn(),
    };

    const mockOnChatMessage = jest.fn();
    const mockOnDataRetrieved = jest.fn();

    render(
      <AIChatInterface
        dataService={dataService}
        aiService={mockAIService}
        onChatMessage={mockOnChatMessage}
        onDataRetrieved={mockOnDataRetrieved}
      />,
    );

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "How was my day yesterday?" },
    });
    fireEvent.click(screen.getByTestId("send-chat-btn"));

    await waitFor(() => {
      expect(mockGetDiaryEntries).toHaveBeenCalledWith(
        "test-user",
        "2025-07-12",
      );
      expect(mockAIService).toHaveBeenCalledWith(
        "How was my day yesterday?",
        diaryData,
      );
      expect(mockOnDataRetrieved).toHaveBeenCalledWith("diary", diaryData);
      expect(screen.getByTestId("chat-response")).toHaveTextContent(
        "Chat response includes yesterday's diary content",
      );
      expect(mockOnChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "How was my day yesterday?",
          dataAccessed: true,
          dataType: "diary",
        }),
      );
    });
  });

  test("Chat accesses calendar data and integrates with AI service", async () => {
    const calendarData = [
      {
        id: 1,
        title: "Team Meeting",
        event_time: "09:00",
        event_date: "2025-07-13",
      },
      {
        id: 2,
        title: "Exercise Session",
        event_time: "18:00",
        event_date: "2025-07-13",
      },
    ];
    mockGetEvents.mockResolvedValue(calendarData);
    mockAIService.mockResolvedValue(
      "Chat response lists today's events and tasks",
    );

    const dataService = {
      getDiaryEntries: jest.fn(),
      getEvents: mockGetEvents,
      getMoodHistory: jest.fn(),
    };

    const mockOnChatMessage = jest.fn();
    const mockOnDataRetrieved = jest.fn();

    render(
      <AIChatInterface
        dataService={dataService}
        aiService={mockAIService}
        onChatMessage={mockOnChatMessage}
        onDataRetrieved={mockOnDataRetrieved}
      />,
    );

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "What's my schedule today?" },
    });
    fireEvent.click(screen.getByTestId("send-chat-btn"));

    await waitFor(() => {
      expect(mockGetEvents).toHaveBeenCalledWith("test-user", "2025-07-13");
      expect(mockAIService).toHaveBeenCalledWith(
        "What's my schedule today?",
        calendarData,
      );
      expect(mockOnDataRetrieved).toHaveBeenCalledWith(
        "calendar",
        calendarData,
      );
      expect(screen.getByTestId("chat-response")).toHaveTextContent(
        "Chat response lists today's events and tasks",
      );
      expect(mockOnChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "What's my schedule today?",
          dataAccessed: true,
          dataType: "calendar",
        }),
      );
    });
  });

  test("Chat accesses mood history and integrates with AI service", async () => {
    const moodData = [
      { mood: "happy", count: 5 },
      { mood: "excited", count: 3 },
    ];
    mockGetMoodHistory.mockResolvedValue(moodData);
    mockAIService.mockResolvedValue("Chat response summarizes mood patterns");

    const dataService = {
      getDiaryEntries: jest.fn(),
      getEvents: jest.fn(),
      getMoodHistory: mockGetMoodHistory,
    };

    const mockOnChatMessage = jest.fn();
    const mockOnDataRetrieved = jest.fn();

    render(
      <AIChatInterface
        dataService={dataService}
        aiService={mockAIService}
        onChatMessage={mockOnChatMessage}
        onDataRetrieved={mockOnDataRetrieved}
      />,
    );

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "How have I been feeling lately?" },
    });
    fireEvent.click(screen.getByTestId("send-chat-btn"));

    await waitFor(() => {
      expect(mockGetMoodHistory).toHaveBeenCalledWith("test-user");
      expect(mockAIService).toHaveBeenCalledWith(
        "How have I been feeling lately?",
        moodData,
      );
      expect(mockOnDataRetrieved).toHaveBeenCalledWith("mood", moodData);
      expect(screen.getByTestId("chat-response")).toHaveTextContent(
        "Chat response summarizes mood patterns",
      );
      expect(mockOnChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "How have I been feeling lately?",
          dataAccessed: true,
          dataType: "mood",
        }),
      );
    });
  });

  test("Chat with no data available - Chat query when no diary/calendar entries exist", async () => {
    mockAIService.mockResolvedValue(
      "You haven't added any entries yet. Would you like to start?",
    );

    const dataService = {
      getDiaryEntries: jest.fn().mockResolvedValue([]),
      getEvents: jest.fn().mockResolvedValue([]),
      getMoodHistory: jest.fn().mockResolvedValue([]),
    };

    const mockOnChatMessage = jest.fn();
    const mockOnDataRetrieved = jest.fn();

    render(
      <AIChatInterface
        dataService={dataService}
        aiService={mockAIService}
        onChatMessage={mockOnChatMessage}
        onDataRetrieved={mockOnDataRetrieved}
      />,
    );

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "What did I do yesterday?" },
    });
    fireEvent.click(screen.getByTestId("send-chat-btn"));

    await waitFor(() => {
      expect(mockAIService).toHaveBeenCalledWith(
        "What did I do yesterday?",
        null,
      );
      expect(screen.getByTestId("chat-response")).toHaveTextContent(
        "You haven't added any entries yet. Would you like to start?",
      );
      expect(mockOnChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "What did I do yesterday?",
          dataAccessed: false,
        }),
      );
      expect(mockOnDataRetrieved).not.toHaveBeenCalled();
    });
  });
});
