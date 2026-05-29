export declare class LLMFactory {
    private static config;
    static getModel(role: 'planner' | 'synthesizer' | 'reflector'): any;
    static createCustomModel(provider: 'anthropic' | 'google', modelName: string, temperature?: number): any;
}
