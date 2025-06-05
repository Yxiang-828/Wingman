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
        throw new Error('Boss needs to authenticate first!');
      }

      const response = await fetch(`${this.baseURL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUserId,
          message: message,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error(`Wingman communication error: HTTP ${response.status}`);
      }

      const result: LLMResponse = await response.json();
      
      // Log performance metrics for debugging
      console.log(`🤖 Wingman Brain (${result.model_used}): Mission completed in ${result.processing_time?.toFixed(2)}s`);
      
      return result;

    } catch (error) {
      console.error('🤖 Wingman Service Error:', error);
      
      // Return faithful wingman fallback response
      return {
        response: "Boss, my AI brain is taking a quick coffee break! Your loyal Wingman is still here in manual mode. Please try again in a moment! ☕🤖",
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
        throw new Error(`Wingman status check failed: HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('🤖 Wingman Status Check Error:', error);
      return {
        status: 'error',
        available: false,
        models: [],
        system_info: {},
        error: error instanceof Error ? error.message : 'Unknown error - Wingman investigating!'
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
      console.error('🤖 Wingman Get Models Error:', error);
      return { models: {}, error: error instanceof Error ? error.message : 'Wingman brain models unavailable' };
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
      console.error('🤖 Wingman Pull Model Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Wingman failed to download brain upgrade' };
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