"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMFactory = void 0;
const anthropic_1 = require("@langchain/anthropic");
const google_genai_1 = require("@langchain/google-genai");
const config_1 = require("@visakha/config");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("llm-factory");
class LLMFactory {
    static getModel(role) {
        const { llm } = this.config;
        let modelName;
        switch (role) {
            case 'planner':
                modelName = llm.plannerModel;
                break;
            case 'synthesizer':
                modelName = llm.synthesizerModel;
                break;
            case 'reflector':
                modelName = llm.reflectorModel;
                break;
            default: modelName = llm.synthesizerModel;
        }
        log.info(`Initializing LLM for role: ${role}`, { provider: llm.provider, model: modelName });
        if (llm.provider === 'gemini' || (llm.provider === 'anthropic' && modelName.includes('gemini'))) {
            return new google_genai_1.ChatGoogleGenerativeAI({
                modelName: modelName,
                apiKey: llm.apiKey,
                maxOutputTokens: llm.maxOutputTokens,
                temperature: llm.temperature,
            });
        }
        return new anthropic_1.ChatAnthropic({
            modelName: modelName,
            anthropicApiKey: llm.apiKey,
            maxTokens: llm.maxOutputTokens,
            temperature: llm.temperature,
        });
    }
    static createCustomModel(provider, modelName, temperature = 0) {
        if (provider === 'google') {
            return new google_genai_1.ChatGoogleGenerativeAI({
                modelName,
                temperature,
            });
        }
        return new anthropic_1.ChatAnthropic({
            modelName,
            temperature,
        });
    }
}
exports.LLMFactory = LLMFactory;
LLMFactory.config = (0, config_1.loadPlatformConfig)();
//# sourceMappingURL=llm-factory.js.map