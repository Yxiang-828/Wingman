// ✅ HYBRID ARCHITECTURE: Chat operations now handled by SQLite via electronAPI
// This file now only provides type definitions and utilities

// ✅ Enhanced ChatMessage interface - matches SQLite schema and supports AI
export interface ChatMessage {
  id: number;
  user_id: string;         // ✅ Based on schema - chat_messages.user_id is "text" type
  session_id?: number;     // ✅ Based on schema - chat_messages.session_id references chat_sessions
  is_ai: boolean;          // ✅ Based on schema - chat_messages.is_ai is "boolean" type
  message: string;         // ✅ Based on schema - chat_messages.message is "text" type
  timestamp: string;       // ✅ Based on schema - chat_messages.timestamp is "text" type
  updated_at?: string;     // ✅ Based on schema - auto-generated timestamp
}

// ✅ Chat Session interface for session management
export interface ChatSession {
  id: number;
  user_id: string;
  title?: string;
  started_at: string;
  updated_at?: string;
}

// ✅ DEPRECATED NOTICE: All data operations moved to SQLite via electronAPI
console.warn('📢 MIGRATION NOTICE: Chat API operations moved to SQLite via electronAPI.db');
console.info('💬 USE INSTEAD: window.electronAPI.db.getChatHistory(), saveChatMessage(), clearChatHistory()');

// ✅ LEGACY API FUNCTIONS - DEPRECATED
// These functions now throw errors to guide migration to direct SQLite calls

export const fetchChatHistory = async (user_id: string): Promise<ChatMessage[]> => {
  const errorMsg = `🚨 fetchChatHistory() is DEPRECATED. Use window.electronAPI.db.getChatHistory() instead.
  
BEFORE: fetchChatHistory('${user_id}')
AFTER:  const chatHistory = await window.electronAPI.db.getChatHistory('${user_id}', 50);`;
        
  console.error(errorMsg);
  throw new Error('fetchChatHistory() moved to window.electronAPI.db.getChatHistory() - check console for migration guide');
};

export const sendChatMessage = async (user_id: string, message: string, timestamp: string): Promise<ChatMessage> => {
  const errorMsg = `🚨 sendChatMessage() is DEPRECATED. Use window.electronAPI.db.saveChatMessage() instead.
  
BEFORE: sendChatMessage('${user_id}', '${message}', '${timestamp}')
AFTER:  const chatMessage = await window.electronAPI.db.saveChatMessage('${message}', false, '${user_id}');`;
        
  console.error(errorMsg);
  throw new Error('sendChatMessage() moved to window.electronAPI.db.saveChatMessage() - check console for migration guide');
};

// ✅ UTILITY FUNCTIONS - Still useful for chat management and AI integration

/**
 * Validate a chat message object has required fields
 */
export const validateChatMessage = (message: Partial<ChatMessage>): message is ChatMessage => {
  return !!(
    message.id &&
    message.user_id &&
    message.message &&
    typeof message.is_ai === 'boolean' &&
    message.timestamp
  );
};

/**
 * Create a default chat message
 */
export const createDefaultChatMessage = (overrides: Partial<ChatMessage> = {}): Omit<ChatMessage, 'id'> => {
  return {
    user_id: '',
    message: '',
    is_ai: false,
    timestamp: new Date().toISOString(),
    ...overrides
  };
};

/**
 * Check if a message is from AI
 */
export const isAIMessage = (message: ChatMessage): boolean => {
  return message.is_ai === true;
};

/**
 * Check if a message is from user
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  } catch {
    return 'Unknown date';
  }
};

/**
 * Group messages by date for chat display
 */
export const groupMessagesByDate = (messages: ChatMessage[]): Record<string, ChatMessage[]> => {
  return messages.reduce((groups, message) => {
    const dateKey = formatMessageDate(message);
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);
};

/**
 * Get recent messages (last N messages)
 */
export const getRecentMessages = (messages: ChatMessage[], count: number = 10): ChatMessage[] => {
  return messages.slice(-count);
};

/**
 * Filter messages by type (user/AI)
 */
export const filterMessagesByType = (messages: ChatMessage[], isAI: boolean): ChatMessage[] => {
  return messages.filter(message => message.is_ai === isAI);
};

/**
 * Get conversation context for AI (last few messages)
 */
export const getConversationContext = (messages: ChatMessage[], contextCount: number = 5): ChatMessage[] => {
  return messages.slice(-contextCount);
};

/**
 * Create AI response message
 */
export const createAIResponse = (content: string, userId: string, sessionId?: number): Omit<ChatMessage, 'id'> => {
  return {
    user_id: userId,
    session_id: sessionId,
    is_ai: true,
    message: content,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create user message
 */
export const createUserMessage = (content: string, userId: string, sessionId?: number): Omit<ChatMessage, 'id'> => {
  return {
    user_id: userId,
    session_id: sessionId,
    is_ai: false,
    message: content,
    timestamp: new Date().toISOString()
  };
};

/**
 * Calculate total message count by type
 */
export const getMessageStats = (messages: ChatMessage[]): { userMessages: number; aiMessages: number; total: number } => {
  const userMessages = messages.filter(m => !m.is_ai).length;
  const aiMessages = messages.filter(m => m.is_ai).length;
  
  return {
    userMessages,
    aiMessages,
    total: messages.length
  };
};

/**
 * Search messages by content
 */
export const searchMessages = (messages: ChatMessage[], query: string): ChatMessage[] => {
  const lowerQuery = query.toLowerCase();
  return messages.filter(message => 
    message.message.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Export chat history to text format
 */
export const exportChatToText = (messages: ChatMessage[]): string => {
  return messages.map(message => {
    const timestamp = formatMessageTime(message);
    const speaker = message.is_ai ? 'AI' : 'You';
    return `[${timestamp}] ${speaker}: ${message.message}`;
  }).join('\n');
};

/**
 * Estimate token count for AI context (rough approximation)
 */
export const estimateTokenCount = (messages: ChatMessage[]): number => {
  const totalChars = messages.reduce((sum, message) => sum + message.message.length, 0);
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(totalChars / 4);
};

/**
 * Trim conversation to fit token limit
 */
export const trimToTokenLimit = (messages: ChatMessage[], maxTokens: number = 4000): ChatMessage[] => {
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

// ✅ MIGRATION HELPER - Show current usage guide
export const showMigrationGuide = () => {
  console.info(`
🔄 CHAT API MIGRATION GUIDE

✅ NEW PATTERN (Direct SQLite):
import { getCurrentUserId } from '../utils/auth';

const ChatComponent = () => {
  const userId = getCurrentUserId();
  
  // Fetch chat history
  const chatHistory = await window.electronAPI.db.getChatHistory(userId, 50);
  
  // Send user message
  const userMessage = await window.electronAPI.db.saveChatMessage(
    'Hello, how are you?', 
    false, // is_ai = false (user message)
    userId
  );
  
  // Save AI response
  const aiResponse = await window.electronAPI.db.saveChatMessage(
    'I am doing well, thank you!', 
    true, // is_ai = true (AI message)
    userId
  );
  
  // Clear chat history
  await window.electronAPI.db.clearChatHistory(userId);
  
  // Get limited history for context
  const recentChat = await window.electronAPI.db.getChatHistory(userId, 10);
};

✅ PERFECT FOR OLLAMA INTEGRATION:
// This SQLite structure is ideal for local AI chat!
const sendToOllama = async (userMessage: string) => {
  // Save user message
  await window.electronAPI.db.saveChatMessage(userMessage, false, userId);
  
  // Get conversation context
  const context = await window.electronAPI.db.getChatHistory(userId, 5);
  
  // Send to Ollama API (local)
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2',
      prompt: buildPromptFromContext(context),
      stream: false
    })
  });
  
  const aiResponse = await response.json();
  
  // Save AI response
  await window.electronAPI.db.saveChatMessage(aiResponse.response, true, userId);
};

❌ OLD PATTERN (Deprecated):
import { fetchChatHistory, sendChatMessage } from '../api/chat';
// These will throw errors now!
`);
};

// ✅ Export type utilities for other files
export type ChatMessageWithoutId = Omit<ChatMessage, 'id'>;
export type ChatMessageUpdate = Partial<ChatMessage>;
export type MessageValidation = {
  isValid: boolean;
  errors: string[];
};

export type MessageType = 'user' | 'ai';
export type ConversationContext = ChatMessage[];