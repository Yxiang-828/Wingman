/**
 * Chat types and utilities
 */

/**
 * types for chat messages
 */
export interface ChatMessage {
  id: number;
  user_id: string;
  session_id?: number;
  is_ai: boolean;
  message: string;
  timestamp: string;
  updated_at?: string;
}

/**
 * types for chat sessions
 */
export interface ChatSession {
  id: number;
  user_id: string;
  title?: string;
  started_at: string;
  updated_at?: string;
}

// Helper functions

/**
 * field validation for chat messages
 */
export const validateChatMessage = (
  message: Partial<ChatMessage>,
): message is ChatMessage => {
  return !!(
    message.id &&
    message.user_id &&
    message.message &&
    typeof message.is_ai === "boolean" &&
    message.timestamp
  );
};

/**
 * default chat message structure
 */
export const createDefaultChatMessage = (
  overrides: Partial<ChatMessage> = {},
): Omit<ChatMessage, "id"> => {
  return {
    user_id: "",
    message: "",
    is_ai: false,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * check if a message is an AI response
 */
export const isAIMessage = (message: ChatMessage): boolean => {
  return message.is_ai === true;
};

/**
 * Check if a message came from the user
 */
export const isUserMessage = (message: ChatMessage): boolean => {
  return message.is_ai === false;
};

/**
 * Format message timestamp for display
 */
export const formatMessageTime = (message: ChatMessage): string => {
  try {
    const date = new Date(message.timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return message.timestamp;
  }
};

/**
 * Format message date for display
 */
export const formatMessageDate = (message: ChatMessage): string => {
  try {
    const date = new Date(message.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch {
    return "Unknown date";
  }
};

/**
 * Group messages by date for chat display
 */
export const groupMessagesByDate = (
  messages: ChatMessage[],
): Record<string, ChatMessage[]> => {
  return messages.reduce(
    (groups, message) => {
      const dateKey = formatMessageDate(message);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
      return groups;
    },
    {} as Record<string, ChatMessage[]>,
  );
};

/**
 * Get recent messages (last N messages)
 */
export const getRecentMessages = (
  messages: ChatMessage[],
  count: number = 10,
): ChatMessage[] => {
  return messages.slice(-count);
};

/**
 * Filter messages by type (user/AI)
 */
export const filterMessagesByType = (
  messages: ChatMessage[],
  isAI: boolean,
): ChatMessage[] => {
  return messages.filter((message) => message.is_ai === isAI);
};

/**
 * Get conversation context for AI (last few messages)
 */
export const getConversationContext = (
  messages: ChatMessage[],
  contextCount: number = 5,
): ChatMessage[] => {
  return messages.slice(-contextCount);
};

/**
 * Create AI response message
 */
export const createAIResponse = (
  content: string,
  userId: string,
  sessionId?: number,
): Omit<ChatMessage, "id"> => {
  return {
    user_id: userId,
    session_id: sessionId,
    is_ai: true,
    message: content,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create user message
 */
export const createUserMessage = (
  content: string,
  userId: string,
  sessionId?: number,
): Omit<ChatMessage, "id"> => {
  return {
    user_id: userId,
    session_id: sessionId,
    is_ai: false,
    message: content,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Calculate total message count by type
 */
export const getMessageStats = (
  messages: ChatMessage[],
): { userMessages: number; aiMessages: number; total: number } => {
  const userMessages = messages.filter((m) => !m.is_ai).length;
  const aiMessages = messages.filter((m) => m.is_ai).length;

  return {
    userMessages,
    aiMessages,
    total: messages.length,
  };
};

/**
 * Search messages by content
 */
export const searchMessages = (
  messages: ChatMessage[],
  query: string,
): ChatMessage[] => {
  const lowerQuery = query.toLowerCase();
  return messages.filter((message) =>
    message.message.toLowerCase().includes(lowerQuery),
  );
};

/**
 * Export chat history to text format
 */
export const exportChatToText = (messages: ChatMessage[]): string => {
  return messages
    .map((message) => {
      const timestamp = formatMessageTime(message);
      const speaker = message.is_ai ? "AI" : "You";
      return `[${timestamp}] ${speaker}: ${message.message}`;
    })
    .join("\n");
};

/**
 * Estimate token count for AI context (rough approximation)
 */
export const estimateTokenCount = (messages: ChatMessage[]): number => {
  const totalChars = messages.reduce(
    (sum, message) => sum + message.message.length,
    0,
  );
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(totalChars / 4);
};

/**
 * Trim conversation to fit token limit
 */
export const trimToTokenLimit = (
  messages: ChatMessage[],
  maxTokens: number = 4000,
): ChatMessage[] => {
  let totalTokens = 0;
  const trimmedMessages: ChatMessage[] = [];

  // Start from the end (most recent) and work backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = Math.ceil(messages[i].message.length / 4);

    if (totalTokens + messageTokens > maxTokens) {
      break;
    }

    totalTokens += messageTokens;
    trimmedMessages.unshift(messages[i]);
  }

  return trimmedMessages;
};

// Export type utilities for other files
export type ChatMessageWithoutId = Omit<ChatMessage, "id">;
export type ChatMessageUpdate = Partial<ChatMessage>;
export type MessageValidation = {
  isValid: boolean;
  errors: string[];
};

export type MessageType = "user" | "ai";
export type ConversationContext = ChatMessage[];
