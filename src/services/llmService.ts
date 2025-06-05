import { getCurrentUserId } from '../utils/auth';

export interface LLMResponse {
  response: string;
  success: boolean;
  model_used?: string;
  processing_time?: number;
  context_used: boolean;
  fallback_used: boolean;
}

export interface LLMStatus {
  status: string;
  available: boolean;
  models: string[];
  recommended_model?: string;
  system_info: any;
  error?: string;
}

class LLMService {
  private baseURL = 'http://localhost:8080/api/v1/chat';

  /**
   * Send a message to Wingman AI and get intelligent response
   */
  async sendMessage(message: string, userId?: string): Promise<LLMResponse> {
    try {
      const currentUserId = userId || getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseURL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUserId,
          message: message,
          date: new Date().toISOString().split('T')[0] // Today's date
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: LLMResponse = await response.json();
      
      // Log performance metrics for debugging
      console.log(`🤖 AI Response (${result.model_used}): ${result.processing_time?.toFixed(2)}s`);
      
      return result;

    } catch (error) {
      console.error('LLM Service Error:', error);
      
      // Return fallback response
      return {
        response: "I'm having trouble connecting to my AI brain right now. Please try again in a moment!",
        success: false,
        context_used: false,
        fallback_used: true
      };
    }
  }

  /**
   * Check AI service health and get system info
   */
  async getStatus(): Promise<LLMStatus> {
    try {
      const response = await fetch(`${this.baseURL}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('LLM Status Check Error:', error);
      return {
        status: 'error',
        available: false,
        models: [],
        system_info: {}, // ✅ FIX: Add missing system_info property
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available models and system recommendations
   */
  async getModels(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/models`);
      return await response.json();
    } catch (error) {
      console.error('Get Models Error:', error);
      return { models: {}, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Pull/download a specific model
   */
  async pullModel(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/pull-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_name: modelName })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Pull Model Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();

// Export individual functions for backwards compatibility
export const sendMessage = (message: string, userId?: string) => 
  llmService.sendMessage(message, userId);

export const getAIStatus = () => 
  llmService.getStatus();

export const getAvailableModels = () => 
  llmService.getModels();

export default llmService;