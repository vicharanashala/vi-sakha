import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";

const log = createLogger("llm-factory");

/**
 * LLM Factory
 * 
 * Handles instantiation of LangChain chat models based on platform configuration.
 * Supports Anthropic (Claude) and Google (Gemini) with configurable models and parameters.
 */
export class LLMFactory {
  private static _config: any = null;

  private static get config() {
    if (!this._config) {
      this._config = loadPlatformConfig();
    }
    return this._config;
  }

  /**
   * Get a chat model instance for a specific agent role.
   * Uses configuration to decide which model/provider to use.
   */
  static getModel(role: 'planner' | 'synthesizer' | 'reflector'): any {
    const { llm } = this.config;
    
    let modelName: string;
    switch (role) {
      case 'planner': modelName = llm.plannerModel; break;
      case 'synthesizer': modelName = llm.synthesizerModel; break;
      case 'reflector': modelName = llm.reflectorModel; break;
      default: modelName = llm.synthesizerModel;
    }

    log.info(`Initializing LLM for role: ${role}`, { provider: llm.provider, model: modelName });

    if (llm.provider === 'gemini' || (llm.provider === 'anthropic' && modelName.includes('gemini'))) {
      return new ChatGoogleGenerativeAI({
        modelName: modelName,
        apiKey: llm.apiKey,
        maxOutputTokens: llm.maxOutputTokens,
        temperature: llm.temperature,
      });
    }

    // Default to Anthropic
    return new ChatAnthropic({
      modelName: modelName,
      anthropicApiKey: llm.apiKey,
      maxTokens: llm.maxOutputTokens,
      temperature: llm.temperature,
    });
  }

  /**
   * Get a specific model by name and provider.
   */
  static createCustomModel(provider: 'anthropic' | 'google', modelName: string, temperature = 0): any {
    if (provider === 'google') {
      return new ChatGoogleGenerativeAI({
        modelName,
        temperature,
      });
    }
    return new ChatAnthropic({
      modelName,
      temperature,
    });
  }
}
